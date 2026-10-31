import { createItem, uploadReceipt } from './items'
import type { Category, ItemInput } from './warranty'

type Sample = {
  name: string
  store: string
  category: Category
  price: number
  warrantyMonths: number
  boughtDaysAgo: number
  serialNumber?: string
  notes?: string
}

// Dates are relative to today so the demo always shows a mix of
// active, expiring-soon and expired warranties.
const SAMPLES: Sample[] = [
  { name: 'Sony WH-1000XM6 Headphones', store: 'Best Buy', category: 'Electronics', price: 449.99, warrantyMonths: 12, boughtDaysAgo: 222, serialNumber: 'SNY-5521-0937' },
  { name: 'MacBook Air 13" M4', store: 'Apple Store', category: 'Electronics', price: 1099, warrantyMonths: 12, boughtDaysAgo: 300, serialNumber: 'C02XK4JHMD6T', notes: 'AppleCare not purchased. Battery health 98%.' },
  { name: 'KitchenAid Stand Mixer', store: 'Amazon', category: 'Kitchen', price: 449.95, warrantyMonths: 12, boughtDaysAgo: 340 },
  { name: 'Dyson V15 Detect Vacuum', store: 'Target', category: 'Appliances', price: 749.99, warrantyMonths: 24, boughtDaysAgo: 400, serialNumber: 'DY-V15-88213' },
  { name: 'Samsung Front-Load Washer', store: 'Home Depot', category: 'Appliances', price: 899, warrantyMonths: 12, boughtDaysAgo: 380, notes: 'Installed by store. Keep the delivery slip.' },
  { name: 'Ninja Air Fryer', store: 'Walmart', category: 'Kitchen', price: 129.99, warrantyMonths: 12, boughtDaysAgo: 520 },
  { name: 'IKEA Markus Office Chair', store: 'IKEA', category: 'Furniture', price: 229, warrantyMonths: 120, boughtDaysAgo: 610 },
  { name: 'DeWalt 20V Drill Kit', store: "Lowe's", category: 'Tools', price: 179, warrantyMonths: 36, boughtDaysAgo: 200, serialNumber: 'DCD777-2025-114' },
]

function isoDateDaysAgo(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Draw a realistic-looking store receipt so the demo has real images to show. */
async function drawReceipt(sample: Sample, date: string): Promise<File> {
  const width = 420
  const height = 640
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')!

  ctx.fillStyle = '#fdfcf7'
  ctx.fillRect(0, 0, width, height)
  ctx.fillStyle = '#1f2937'
  ctx.textAlign = 'center'
  ctx.font = 'bold 28px "Courier New", monospace'
  ctx.fillText(sample.store.toUpperCase(), width / 2, 60)
  ctx.font = '15px "Courier New", monospace'
  ctx.fillText('123 Market Street', width / 2, 88)
  ctx.fillText("Store #0421  Tel (555) 010-2030", width / 2, 108)

  const line = (y: number) => {
    ctx.fillText('-'.repeat(38), width / 2, y)
  }
  line(135)

  ctx.textAlign = 'left'
  const row = (left: string, right: string, y: number) => {
    ctx.textAlign = 'left'
    ctx.fillText(left, 30, y)
    ctx.textAlign = 'right'
    ctx.fillText(right, width - 30, y)
  }
  const [y, m, d] = date.split('-')
  row('DATE', `${m}/${d}/${y}`, 165)
  row('TIME', '14:32', 187)
  row('RECEIPT', `#${Math.floor(Math.random() * 900000 + 100000)}`, 209)
  ctx.textAlign = 'center'
  line(235)

  ctx.font = 'bold 15px "Courier New", monospace'
  const name = sample.name.length > 26 ? sample.name.slice(0, 25) + '…' : sample.name
  row(name, `$${sample.price.toFixed(2)}`, 265)
  ctx.font = '13px "Courier New", monospace'
  if (sample.serialNumber) row(`  S/N ${sample.serialNumber}`, '', 285)
  row(`  Mfr warranty: ${sample.warrantyMonths} mo`, '', 305)

  ctx.font = '15px "Courier New", monospace'
  ctx.textAlign = 'center'
  line(340)
  const tax = Math.round(sample.price * 0.0825 * 100) / 100
  row('SUBTOTAL', `$${sample.price.toFixed(2)}`, 370)
  row('TAX 8.25%', `$${tax.toFixed(2)}`, 392)
  ctx.font = 'bold 18px "Courier New", monospace'
  row('TOTAL', `$${(sample.price + tax).toFixed(2)}`, 422)
  ctx.font = '15px "Courier New", monospace'
  row('VISA **** 4821', 'APPROVED', 450)

  ctx.textAlign = 'center'
  line(478)
  ctx.fillText('KEEP THIS RECEIPT FOR', width / 2, 505)
  ctx.fillText('WARRANTY & RETURNS', width / 2, 525)

  // Barcode
  let x = 70
  while (x < width - 70) {
    const w = Math.random() > 0.5 ? 3 : 1.5
    ctx.fillRect(x, 548, w, 50)
    x += w + (Math.random() > 0.5 ? 3 : 2)
  }

  const blob = await new Promise<Blob>((resolve) => canvas.toBlob((b) => resolve(b!), 'image/png'))
  const slug = sample.store.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  return new File([blob], `receipt-${slug}-${date}.png`, { type: 'image/png' })
}

/** Create the sample items (with receipt images) for the given user. */
export async function loadSampleItems(userId: string, onProgress?: (done: number, total: number) => void) {
  let done = 0
  await Promise.all(
    SAMPLES.map(async (sample) => {
      const purchaseDate = isoDateDaysAgo(sample.boughtDaysAgo)
      const receiptFileId = await uploadReceipt(await drawReceipt(sample, purchaseDate), userId)
      const input: ItemInput = {
        name: sample.name,
        store: sample.store,
        category: sample.category,
        purchaseDate,
        warrantyMonths: sample.warrantyMonths,
        price: sample.price,
        serialNumber: sample.serialNumber ?? null,
        notes: sample.notes ?? null,
        receiptFileId,
      }
      await createItem(input, userId)
      onProgress?.(++done, SAMPLES.length)
    }),
  )
}
