import { ID, Permission, Query, Role } from 'appwrite'
import { client, config, storage, tablesDB } from './appwrite'
import { addMonths, type Item, type ItemInput } from './warranty'

const ids = { databaseId: config.databaseId, tableId: config.tableId }

function ownerPermissions(userId: string) {
  return [
    Permission.read(Role.user(userId)),
    Permission.update(Role.user(userId)),
    Permission.delete(Role.user(userId)),
  ]
}

function toRowData(input: ItemInput, userId: string) {
  return {
    ...input,
    store: input.store?.trim() || null,
    serialNumber: input.serialNumber?.trim() || null,
    notes: input.notes?.trim() || null,
    purchaseDate: new Date(input.purchaseDate.slice(0, 10) + 'T00:00:00.000Z').toISOString(),
    // Stored (not just computed) so TablesDB can sort and filter by expiry.
    warrantyEndsAt: addMonths(input.purchaseDate, input.warrantyMonths).toISOString(),
    userId,
  }
}

/** All of the user's items, soonest-expiring first. */
export async function listItems(userId: string): Promise<Item[]> {
  const res = await tablesDB.listRows({
    ...ids,
    queries: [Query.equal('userId', userId), Query.orderAsc('warrantyEndsAt'), Query.limit(500)],
  })
  return res.rows as unknown as Item[]
}

export async function getItem(itemId: string): Promise<Item> {
  const row = await tablesDB.getRow({ ...ids, rowId: itemId })
  return row as unknown as Item
}

export async function createItem(input: ItemInput, userId: string): Promise<Item> {
  const row = await tablesDB.createRow({
    ...ids,
    rowId: ID.unique(),
    data: toRowData(input, userId),
    permissions: ownerPermissions(userId),
  })
  return row as unknown as Item
}

export async function updateItem(itemId: string, input: ItemInput, userId: string): Promise<Item> {
  const row = await tablesDB.updateRow({ ...ids, rowId: itemId, data: toRowData(input, userId) })
  return row as unknown as Item
}

export async function deleteItem(item: Item): Promise<void> {
  await tablesDB.deleteRow({ ...ids, rowId: item.$id })
  if (item.receiptFileId) await deleteReceipt(item.receiptFileId)
}

// ---- Receipts (Appwrite Storage) ----

export async function uploadReceipt(file: File, userId: string): Promise<string> {
  const uploaded = await storage.createFile({
    bucketId: config.bucketId,
    fileId: ID.unique(),
    file,
    permissions: ownerPermissions(userId),
  })
  return uploaded.$id
}

export async function deleteReceipt(fileId: string): Promise<void> {
  try {
    await storage.deleteFile({ bucketId: config.bucketId, fileId })
  } catch {
    // The file may already be gone; nothing else to clean up.
  }
}

export type ReceiptBlob = { url: string; mimeType: string }

/**
 * Receipts are private, so a plain <img src> can fail when the browser blocks
 * third-party cookies. Fetching through the SDK sends the session either way.
 */
export async function fetchReceipt(fileId: string): Promise<ReceiptBlob> {
  const file = await storage.getFile({ bucketId: config.bucketId, fileId })
  const url = new URL(storage.getFileView({ bucketId: config.bucketId, fileId }))
  const buffer: ArrayBuffer = await client.call('get', url, {}, {}, 'arrayBuffer')
  const blob = new Blob([buffer], { type: file.mimeType })
  return { url: URL.createObjectURL(blob), mimeType: file.mimeType }
}
