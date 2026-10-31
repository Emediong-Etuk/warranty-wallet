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

const endpoint = env('VITE_APPWRITE_ENDPOINT').trim().replace(/^["']|["']$/g, '')
if (!/^https?:\/\//.test(endpoint)) {
  console.error(`VITE_APPWRITE_ENDPOINT must start with https:// (yours is "${endpoint}")`)
  console.error('It should look like https://fra.cloud.appwrite.io/v1')
  process.exit(1)
}
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

/** Explain a network error in plain words, including the underlying cause. */
function describeNetworkError(err: unknown): string {
  const cause = (err as { cause?: { code?: string; message?: string } })?.cause
  const code = cause?.code ?? ''
  const detail = cause?.message ?? (err instanceof Error ? err.message : String(err))
  const hints: Record<string, string> = {
    ENOTFOUND: 'The endpoint address could not be found. Check VITE_APPWRITE_ENDPOINT for typos, and check your internet connection.',
    EAI_AGAIN: 'Could not look up the endpoint address. Check your internet connection.',
    ECONNREFUSED: 'The server refused the connection. Check VITE_APPWRITE_ENDPOINT.',
    ETIMEDOUT: 'The connection timed out. A firewall, VPN or proxy may be blocking it.',
    ECONNRESET: 'The connection was cut off. A firewall, VPN or proxy may be blocking it.',
    UNABLE_TO_GET_ISSUER_CERT_LOCALLY:
      'Antivirus or a company network is intercepting HTTPS. See "Troubleshooting" in the README.',
    SELF_SIGNED_CERT_IN_CHAIN:
      'Antivirus or a company network is intercepting HTTPS. See "Troubleshooting" in the README.',
  }
  return `${detail}${code ? ` (${code})` : ''}\n  ${hints[code] ?? 'Check VITE_APPWRITE_ENDPOINT and your internet connection.'}`
}

/** Make sure the endpoint is reachable before doing anything else. */
async function checkConnection() {
  let url: URL
  try {
    url = new URL(endpoint.replace(/\/+$/, '') + '/health/version')
  } catch {
    console.error(`VITE_APPWRITE_ENDPOINT is not a valid URL: "${endpoint}"`)
    console.error('It should look like https://fra.cloud.appwrite.io/v1 (no quotes or spaces).')
    process.exit(1)
  }
  if (!endpoint.endsWith('/v1')) {
    console.warn(`Warning: VITE_APPWRITE_ENDPOINT usually ends with /v1 (yours is "${endpoint}")`)
  }
  try {
    await fetch(url)
    console.log(`Connected to ${url.host}\n`)
  } catch (err) {
    console.error(`\nCould not reach ${url.origin}`)
    console.error(`  ${describeNetworkError(err)}\n`)
    process.exit(1)
  }
}

async function main() {
  console.log(`\nSetting up Warranty Wallet in project "${projectId}"`)
  console.log(`Endpoint: ${endpoint}\n`)
  await checkConnection()

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
  if (err instanceof AppwriteException) {
    console.error(`\nSetup failed: ${err.message} (HTTP ${err.code}, ${err.type})`)
    if (err.code === 401) console.error('  Check APPWRITE_API_KEY and that the key has the scopes listed in .env.example.')
    if (err.code === 404) console.error('  Check VITE_APPWRITE_PROJECT_ID and that the endpoint region matches your project.')
  } else {
    console.error(`\nSetup failed: ${describeNetworkError(err)}`)
  }
  process.exit(1)
})
