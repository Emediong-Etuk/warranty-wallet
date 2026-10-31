import { useEffect, useMemo, useState, type FormEvent } from 'react'
import ReceiptViewer from './ReceiptViewer'
import {
  addMonths,
  CATEGORIES,
  CATEGORY_ICONS,
  describeDaysLeft,
  daysLeft,
  formatDate,
  statusOf,
  type Category,
  type Item,
  type ItemInput,
} from '../lib/warranty'
import StatusBadge from './StatusBadge'

const WARRANTY_PRESETS = [
  { label: '90 days', months: 3 },
  { label: '1 year', months: 12 },
  { label: '2 years', months: 24 },
  { label: '3 years', months: 36 },
  { label: '5 years', months: 60 },
]

function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export type ItemFormResult = {
  input: ItemInput
  newReceipt: File | null
  removeReceipt: boolean
}

type Props = {
  initial?: Item
  submitLabel: string
  onSubmit: (result: ItemFormResult) => Promise<void>
  onCancel: () => void
}

export default function ItemForm({ initial, submitLabel, onSubmit, onCancel }: Props) {
  const [name, setName] = useState(initial?.name ?? '')
  const [store, setStore] = useState(initial?.store ?? '')
  const [category, setCategory] = useState<Category>(initial?.category ?? 'Electronics')
  const [purchaseDate, setPurchaseDate] = useState(initial?.purchaseDate.slice(0, 10) ?? today())
  const [warrantyMonths, setWarrantyMonths] = useState(initial?.warrantyMonths ?? 12)
  const [price, setPrice] = useState(initial?.price != null ? String(initial.price) : '')
  const [serialNumber, setSerialNumber] = useState(initial?.serialNumber ?? '')
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [receipt, setReceipt] = useState<File | null>(null)
  const [removeReceipt, setRemoveReceipt] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const receiptPreview = useMemo(
    () => (receipt && receipt.type.startsWith('image/') ? URL.createObjectURL(receipt) : null),
    [receipt],
  )
  useEffect(() => () => {
    if (receiptPreview) URL.revokeObjectURL(receiptPreview)
  }, [receiptPreview])

  const endsAt = purchaseDate ? addMonths(purchaseDate, warrantyMonths).toISOString() : null
  const existingReceipt = initial?.receiptFileId && !removeReceipt && !receipt ? initial.receiptFileId : null

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (receipt && receipt.size > 10 * 1024 * 1024) {
      setError('Receipt files must be 10 MB or smaller.')
      return
    }
    setSaving(true)
    try {
      await onSubmit({
        input: {
          name: name.trim(),
          store: store.trim() || null,
          category,
          purchaseDate,
          warrantyMonths,
          price: price === '' ? null : Number(price),
          serialNumber: serialNumber.trim() || null,
          notes: notes.trim() || null,
          receiptFileId: initial?.receiptFileId ?? null,
        },
        newReceipt: receipt,
        removeReceipt,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="card space-y-5 p-6">
        <div>
          <label className="label" htmlFor="name">
            What did you buy?
          </label>
          <input
            id="name"
            className="input"
            required
            maxLength={128}
            placeholder="e.g. Sony WH-1000XM6 Headphones"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus={!initial}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="store">
              Store
            </label>
            <input
              id="store"
              className="input"
              maxLength={128}
              placeholder="e.g. Best Buy"
              value={store}
              onChange={(e) => setStore(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="price">
              Price (USD)
            </label>
            <input
              id="price"
              className="input"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
        </div>

        <div>
          <span className="label">Category</span>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                type="button"
                key={c}
                onClick={() => setCategory(c)}
                className={`rounded-full border px-3 py-1.5 text-sm transition ${
                  category === c
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
                }`}
              >
                {CATEGORY_ICONS[c]} {c}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="purchaseDate">
              Purchase date
            </label>
            <input
              id="purchaseDate"
              className="input"
              type="date"
              required
              max={today()}
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="warrantyMonths">
              Warranty length (months)
            </label>
            <input
              id="warrantyMonths"
              className="input"
              type="number"
              min="0"
              max="600"
              required
              value={warrantyMonths}
              onChange={(e) => setWarrantyMonths(Math.max(0, Math.min(600, Number(e.target.value) || 0)))}
            />
          </div>
        </div>
        <div className="-mt-2 flex flex-wrap gap-2">
          {WARRANTY_PRESETS.map((p) => (
            <button
              type="button"
              key={p.months}
              onClick={() => setWarrantyMonths(p.months)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                warrantyMonths === p.months ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {endsAt && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl bg-slate-50 px-4 py-3 text-sm">
            <span className="text-slate-600">
              Warranty ends <strong className="text-slate-900">{formatDate(endsAt)}</strong>
            </span>
            <StatusBadge status={statusOf(endsAt)} />
            <span className="text-slate-500">{describeDaysLeft(daysLeft(endsAt))}</span>
          </div>
        )}

        <div>
          <label className="label" htmlFor="serial">
            Serial number <span className="font-normal text-slate-400">(optional, helps with claims)</span>
          </label>
          <input
            id="serial"
            className="input font-mono"
            maxLength={128}
            value={serialNumber}
            onChange={(e) => setSerialNumber(e.target.value)}
          />
        </div>

        <div>
          <label className="label" htmlFor="notes">
            Notes
          </label>
          <textarea
            id="notes"
            className="input min-h-20"
            placeholder="Order number, extended warranty details, support phone number…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div className="card p-5">
          <span className="label">Receipt</span>
          {receiptPreview ? (
            <img src={receiptPreview} alt="New receipt" className="mb-3 max-h-80 w-full rounded-lg object-contain bg-slate-50" />
          ) : receipt ? (
            <div className="mb-3 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">📄 {receipt.name}</div>
          ) : existingReceipt ? (
            <ReceiptViewer fileId={existingReceipt} className="mb-3 max-h-80 w-full rounded-lg bg-slate-50" />
          ) : null}

          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 px-4 py-6 text-center transition hover:border-indigo-400 hover:bg-indigo-50/40">
            <span className="text-2xl">📸</span>
            <span className="mt-1 text-sm font-medium text-slate-700">
              {receipt || existingReceipt ? 'Replace receipt' : 'Snap or upload a receipt'}
            </span>
            <span className="text-xs text-slate-500">JPG, PNG, HEIC or PDF · up to 10 MB</span>
            <input
              type="file"
              accept="image/*,application/pdf"
              capture="environment"
              className="hidden"
              onChange={(e) => {
                setReceipt(e.target.files?.[0] ?? null)
                setRemoveReceipt(false)
              }}
            />
          </label>
          {(receipt || existingReceipt) && (
            <button
              type="button"
              className="mt-2 w-full text-sm text-slate-500 hover:text-red-600"
              onClick={() => {
                setReceipt(null)
                if (initial?.receiptFileId) setRemoveReceipt(true)
              }}
            >
              Remove receipt
            </button>
          )}
        </div>

        {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

        <div className="flex gap-3">
          <button type="button" onClick={onCancel} className="btn-secondary flex-1">
            Cancel
          </button>
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? 'Saving…' : submitLabel}
          </button>
        </div>
      </div>
    </form>
  )
}
