export const CATEGORIES = [
  'Electronics',
  'Appliances',
  'Kitchen',
  'Furniture',
  'Tools',
  'Vehicles',
  'Other',
] as const

export type Category = (typeof CATEGORIES)[number]

export const CATEGORY_ICONS: Record<Category, string> = {
  Electronics: '💻',
  Appliances: '🧺',
  Kitchen: '🍳',
  Furniture: '🛋️',
  Tools: '🛠️',
  Vehicles: '🚲',
  Other: '📦',
}

export type Item = {
  $id: string
  $createdAt: string
  name: string
  store: string | null
  category: Category
  purchaseDate: string
  warrantyMonths: number
  warrantyEndsAt: string
  price: number | null
  serialNumber: string | null
  notes: string | null
  receiptFileId: string | null
  userId: string
}

export type ItemInput = Omit<Item, '$id' | '$createdAt' | 'warrantyEndsAt' | 'userId'>

export type WarrantyStatus = 'active' | 'expiring' | 'expired'

/** Items with this many days or fewer left are flagged as "expiring soon". */
export const EXPIRING_SOON_DAYS = 90

const DAY_MS = 24 * 60 * 60 * 1000

/** Parse "YYYY-MM-DD" (or an ISO string) into a UTC-midnight Date. */
export function toUtcDate(value: string): Date {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

/** Purchase date + N months, clamped to the end of shorter months (Jan 31 + 1 month = Feb 28/29). */
export function addMonths(dateStr: string, months: number): Date {
  const start = toUtcDate(dateStr)
  const target = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + months, 1))
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  target.setUTCDate(Math.min(start.getUTCDate(), lastDay))
  return target
}

function todayUtc(): Date {
  const now = new Date()
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()))
}

/** Whole days from today until the warranty ends. Negative once expired. */
export function daysLeft(warrantyEndsAt: string): number {
  return Math.round((toUtcDate(warrantyEndsAt).getTime() - todayUtc().getTime()) / DAY_MS)
}

export function statusOf(warrantyEndsAt: string): WarrantyStatus {
  const days = daysLeft(warrantyEndsAt)
  if (days < 0) return 'expired'
  if (days <= EXPIRING_SOON_DAYS) return 'expiring'
  return 'active'
}

/** Fraction (0–1) of the warranty period that has passed. */
export function progressOf(item: Pick<Item, 'purchaseDate' | 'warrantyEndsAt'>): number {
  const start = toUtcDate(item.purchaseDate).getTime()
  const end = toUtcDate(item.warrantyEndsAt).getTime()
  if (end <= start) return 1
  return Math.min(1, Math.max(0, (todayUtc().getTime() - start) / (end - start)))
}

export function formatDate(value: string): string {
  return toUtcDate(value).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  })
}

export function formatMoney(value: number | null | undefined): string {
  if (value == null) return '—'
  return value.toLocaleString(undefined, { style: 'currency', currency: 'USD' })
}

/** Human-friendly "time left" text, e.g. "1 year, 3 months left" or "Expired 12 days ago". */
export function describeDaysLeft(days: number): string {
  if (days === 0) return 'Ends today'
  const abs = Math.abs(days)
  let text: string
  if (abs < 60) text = `${abs} day${abs === 1 ? '' : 's'}`
  else if (abs < 730) {
    const months = Math.floor(abs / 30.44)
    text = `${months} month${months === 1 ? '' : 's'}`
  } else {
    const years = Math.floor(abs / 365.25)
    const months = Math.floor((abs - years * 365.25) / 30.44)
    text = `${years} year${years === 1 ? '' : 's'}${months ? `, ${months} month${months === 1 ? '' : 's'}` : ''}`
  }
  return days > 0 ? `${text} left` : `Expired ${text} ago`
}

export function formatWarrantyLength(months: number): string {
  if (months === 0) return 'No warranty'
  if (months % 12 === 0) return `${months / 12} year${months === 12 ? '' : 's'}`
  return `${months} months`
}
