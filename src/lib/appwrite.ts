import { Account, Client, Storage, TablesDB } from 'appwrite'

export const config = {
  endpoint: import.meta.env.VITE_APPWRITE_ENDPOINT as string,
  projectId: import.meta.env.VITE_APPWRITE_PROJECT_ID as string,
  databaseId: (import.meta.env.VITE_APPWRITE_DATABASE_ID as string) || 'warranty_wallet',
  tableId: (import.meta.env.VITE_APPWRITE_TABLE_ID as string) || 'items',
  bucketId: (import.meta.env.VITE_APPWRITE_BUCKET_ID as string) || 'receipts',
}

export const isConfigured = Boolean(
  config.endpoint && config.projectId && !config.projectId.startsWith('your-'),
)

export const client = new Client()
if (isConfigured) client.setEndpoint(config.endpoint).setProject(config.projectId)

export const account = new Account(client)
export const tablesDB = new TablesDB(client)
export const storage = new Storage(client)
