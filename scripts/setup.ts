/**
 * One-time Appwrite setup for Warranty Wallet.
 *
 * Creates (or skips if they already exist):
 *   - a TablesDB database
 *   - the `items` table with its columns and an index
 *   - the `receipts` storage bucket
 *
 * Run with:  npm run setup   (reads values from .env)
 */
import {
  AppwriteException,
  Client,
  Compression,
  Permission,
  Role,
  Storage,
  TablesDB,
  TablesDBIndexType,
  OrderBy,
} from 'node-appwrite'

function env(name: string): string {
  const value = process.env[name]
  if (!value || value.startsWith('your-')) {
    console.error(`Missing ${name} in .env (see .env.example)`)
    process.exit(1)
  }
  return value
}

const endpoint = env('VITE_APPWRITE_ENDPOINT')
const projectId = env('VITE_APPWRITE_PROJECT_ID')
const apiKey = env('APPWRITE_API_KEY')
const databaseId = process.env.VITE_APPWRITE_DATABASE_ID || 'warranty_wallet'
const tableId = process.env.VITE_APPWRITE_TABLE_ID || 'items'
const bucketId = process.env.VITE_APPWRITE_BUCKET_ID || 'receipts'

export const CATEGORIES = [
  'Electronics',
  'Appliances',
  'Kitchen',
  'Furniture',
  'Tools',
  'Vehicles',
  'Other',
]

const client = new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey)
const tablesDB = new TablesDB(client)
const storage = new Storage(client)

/** Run a create call, treating "already exists" (409) as success. */
async function ensure(label: string, fn: () => Promise<unknown>) {
  try {
    await fn()
    console.log(`  created  ${label}`)
  } catch (err) {
    if (err instanceof AppwriteException && err.code === 409) {
      console.log(`  exists   ${label}`)
      return
    }
    console.error(`  FAILED   ${label}`)
    throw err
  }
}

async function waitForColumns() {
  for (let attempt = 0; attempt < 60; attempt++) {
    const { columns } = await tablesDB.listColumns({ databaseId, tableId })
    const pending = columns.filter((c) => c.status !== 'available')
    const failed = columns.filter((c) => c.status === 'failed' || c.status === 'stuck')
    if (failed.length) {
      throw new Error(`Columns failed: ${failed.map((c) => c.key).join(', ')}`)
    }
    if (!pending.length) return
    await new Promise((r) => setTimeout(r, 1000))
  }
  throw new Error('Timed out waiting for columns to become available')
}

async function main() {
  console.log(`\nSetting up Warranty Wallet in project "${projectId}"\n`)

  console.log('Database')
  await ensure(`database "${databaseId}"`, () =>
    tablesDB.create({ databaseId, name: 'Warranty Wallet' }),
  )

  console.log('\nTable')
  // Any signed-in user can create rows. Row security is on, so each row is
  // only readable/editable by the user it was created for.
  await ensure(`table "${tableId}"`, () =>
    tablesDB.createTable({
      databaseId,
      tableId,
      name: 'Items',
      permissions: [Permission.create(Role.users())],
      rowSecurity: true,
    }),
  )

  console.log('\nColumns')
  const base = { databaseId, tableId }
  await ensure('name', () =>
    tablesDB.createVarcharColumn({ ...base, key: 'name', size: 128, required: true }),
  )
  await ensure('store', () =>
    tablesDB.createVarcharColumn({ ...base, key: 'store', size: 128, required: false }),
  )
  await ensure('category', () =>
    tablesDB.createEnumColumn({ ...base, key: 'category', elements: CATEGORIES, required: true }),
  )
  await ensure('purchaseDate', () =>
    tablesDB.createDatetimeColumn({ ...base, key: 'purchaseDate', required: true }),
  )
  await ensure('warrantyMonths', () =>
    tablesDB.createIntegerColumn({ ...base, key: 'warrantyMonths', required: true, min: 0, max: 600 }),
  )
  await ensure('warrantyEndsAt', () =>
    tablesDB.createDatetimeColumn({ ...base, key: 'warrantyEndsAt', required: true }),
  )
  await ensure('price', () =>
    tablesDB.createFloatColumn({ ...base, key: 'price', required: false, min: 0 }),
  )
  await ensure('serialNumber', () =>
    tablesDB.createVarcharColumn({ ...base, key: 'serialNumber', size: 128, required: false }),
  )
  await ensure('notes', () =>
    tablesDB.createTextColumn({ ...base, key: 'notes', required: false }),
  )
  await ensure('receiptFileId', () =>
    tablesDB.createVarcharColumn({ ...base, key: 'receiptFileId', size: 64, required: false }),
  )
  await ensure('userId', () =>
    tablesDB.createVarcharColumn({ ...base, key: 'userId', size: 64, required: true }),
  )

  console.log('\nWaiting for columns to be ready...')
  await waitForColumns()

  console.log('\nIndexes')
  // Powers the dashboard query: "my items, soonest-expiring first".
  await ensure('idx_user_expiry', () =>
    tablesDB.createIndex({
      ...base,
      key: 'idx_user_expiry',
      type: TablesDBIndexType.Key,
      columns: ['userId', 'warrantyEndsAt'],
      orders: [OrderBy.Asc, OrderBy.Asc],
    }),
  )

  console.log('\nStorage')
  await ensure(`bucket "${bucketId}"`, () =>
    storage.createBucket({
      bucketId,
      name: 'Receipts',
      permissions: [Permission.create(Role.users())],
      fileSecurity: true,
      maximumFileSize: 10 * 1024 * 1024,
      allowedFileExtensions: ['jpg', 'jpeg', 'png', 'webp', 'heic', 'pdf'],
      compression: Compression.Gzip,
      encryption: true,
      antivirus: true,
    }),
  )

  console.log('\nDone! Next: add your web platform in the Appwrite Console, then run `npm run dev`.\n')
}

main().catch((err) => {
  console.error('\nSetup failed:', err instanceof Error ? err.message : err)
  process.exit(1)
})
