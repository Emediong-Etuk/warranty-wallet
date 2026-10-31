import { useEffect, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ReceiptViewer from '../components/ReceiptViewer'
import StatusBadge, { STATUS_COLORS } from '../components/StatusBadge'
import { downloadReminder } from '../lib/calendar'
import { deleteItem, getItem } from '../lib/items'
import {
  CATEGORY_ICONS,
  daysLeft,
  formatDate,
  formatMoney,
  formatWarrantyLength,
  progressOf,
  statusOf,
  type Item,
} from '../lib/warranty'

const HEADLINES = {
  active: { title: 'Covered', tone: 'from-emerald-500 to-teal-600' },
  expiring: { title: 'Covered, but not for long', tone: 'from-amber-500 to-orange-600' },
  expired: { title: 'No longer covered', tone: 'from-rose-500 to-red-600' },
}

export default function ItemDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [item, setItem] = useState<Item | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [copied, setCopied] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!id) return
    getItem(id)
      .then(setItem)
      .catch(() => setNotFound(true))
  }, [id])

  if (notFound) {
    return (
      <div className="card mx-auto max-w-lg p-8 text-center">
        <p className="text-lg font-semibold">Item not found</p>
        <Link to="/" className="btn-primary mt-6">
          Back to wallet
        </Link>
      </div>
    )
  }
  if (!item) return <div className="card h-96 animate-pulse bg-slate-100" />

  const status = statusOf(item.warrantyEndsAt)
  const days = daysLeft(item.warrantyEndsAt)
  const headline = HEADLINES[status]

  async function copyClaimDetails() {
    if (!item) return
    const text = [
      `Product: ${item.name}`,
      item.serialNumber ? `Serial number: ${item.serialNumber}` : null,
      item.store ? `Purchased from: ${item.store}` : null,
      `Purchase date: ${formatDate(item.purchaseDate)}`,
      item.price != null ? `Price paid: ${formatMoney(item.price)}` : null,
      `Warranty: ${formatWarrantyLength(item.warrantyMonths)} (ends ${formatDate(item.warrantyEndsAt)})`,
    ]
      .filter(Boolean)
      .join('\n')
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function handleDelete() {
    if (!item || !confirm(`Delete "${item.name}" and its receipt? This can't be undone.`)) return
    setDeleting(true)
    try {
      await deleteItem(item)
      navigate('/')
    } catch {
      setDeleting(false)
      alert('Could not delete the item. Please try again.')
    }
  }

  return (
    <div className="space-y-6">
      <Link to="/" className="text-sm font-medium text-slate-500 hover:text-slate-800">
        ← Back to wallet
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <div className="space-y-6">
          <div className={`overflow-hidden rounded-2xl bg-gradient-to-br ${headline.tone} p-6 text-white shadow-lg sm:p-8`}>
            <div className="flex items-center gap-3 text-white/90">
              <span className="text-2xl">{CATEGORY_ICONS[item.category]}</span>
              <span className="text-sm font-medium uppercase tracking-wide">{item.category}</span>
            </div>
            <h1 className="mt-3 text-2xl font-bold sm:text-3xl">{item.name}</h1>
            <p className="mt-6 text-sm font-medium uppercase tracking-wide text-white/80">{headline.title}</p>
            <p className="mt-1 text-5xl font-extrabold tabular-nums sm:text-6xl">
              {days >= 0 ? days.toLocaleString() : Math.abs(days).toLocaleString()}
              <span className="ml-2 text-xl font-semibold text-white/90">
                {days >= 0 ? `day${days === 1 ? '' : 's'} left` : `day${days === -1 ? '' : 's'} since it expired`}
              </span>
            </p>
            <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/25">
              <div className="h-full rounded-full bg-white" style={{ width: `${progressOf(item) * 100}%` }} />
            </div>
            <div className="mt-2 flex justify-between text-xs text-white/80">
              <span>Bought {formatDate(item.purchaseDate)}</span>
              <span>Ends {formatDate(item.warrantyEndsAt)}</span>
            </div>
          </div>

          <div className="card divide-y divide-slate-100">
            <Row label="Status">
              <StatusBadge status={status} />
            </Row>
            <Row label="Store">{item.store || '—'}</Row>
            <Row label="Price paid">{formatMoney(item.price)}</Row>
            <Row label="Purchase date">{formatDate(item.purchaseDate)}</Row>
            <Row label="Warranty">{formatWarrantyLength(item.warrantyMonths)}</Row>
            <Row label="Warranty ends">
              <span className="inline-flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${STATUS_COLORS[status]}`} />
                {formatDate(item.warrantyEndsAt)}
              </span>
            </Row>
            <Row label="Serial number">
              <span className="font-mono">{item.serialNumber || '—'}</span>
            </Row>
            {item.notes && (
              <div className="px-5 py-4">
                <p className="text-sm text-slate-500">Notes</p>
                <p className="mt-1 whitespace-pre-wrap text-sm">{item.notes}</p>
              </div>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <button onClick={copyClaimDetails} className="btn-primary">
              {copied ? '✓ Copied' : '📋 Copy claim details'}
            </button>
            {status !== 'expired' && (
              <button onClick={() => downloadReminder(item)} className="btn-secondary">
                🔔 Remind me 30 days before
              </button>
            )}
            <Link to={`/items/${item.$id}/edit`} className="btn-secondary">
              ✏️ Edit
            </Link>
            <button onClick={handleDelete} disabled={deleting} className="btn-danger">
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          </div>
        </div>

        <div className="card h-fit p-4">
          <p className="mb-3 px-1 text-sm font-semibold text-slate-700">Proof of purchase</p>
          {item.receiptFileId ? (
            <ReceiptViewer fileId={item.receiptFileId} className="max-h-[640px] w-full rounded-lg bg-slate-50" />
          ) : (
            <div className="rounded-xl border-2 border-dashed border-slate-200 px-6 py-12 text-center">
              <p className="text-3xl">🧾</p>
              <p className="mt-2 text-sm text-slate-500">No receipt saved yet.</p>
              <Link to={`/items/${item.$id}/edit`} className="btn-secondary mt-4">
                Add receipt
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-3.5 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900">{children}</span>
    </div>
  )
}
