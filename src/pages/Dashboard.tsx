import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import StatusBadge, { STATUS_COLORS } from '../components/StatusBadge'
import { useAuth } from '../lib/auth'
import { listItems } from '../lib/items'
import { loadSampleItems } from '../lib/sampleData'
import {
  CATEGORIES,
  CATEGORY_ICONS,
  daysLeft,
  describeDaysLeft,
  EXPIRING_SOON_DAYS,
  formatDate,
  formatMoney,
  progressOf,
  statusOf,
  type Category,
  type Item,
  type WarrantyStatus,
} from '../lib/warranty'

type StatusFilter = 'all' | WarrantyStatus

const STATUS_TABS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Under warranty' },
  { key: 'expiring', label: 'Expiring soon' },
  { key: 'expired', label: 'Expired' },
]

export default function Dashboard() {
  const { user } = useAuth()
  const [items, setItems] = useState<Item[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<Category | 'all'>('all')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [seeding, setSeeding] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!user) return
    try {
      setItems(await listItems(user.$id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your items.')
    }
  }, [user])

  useEffect(() => {
    load()
  }, [load])

  const stats = useMemo(() => {
    const list = items ?? []
    const covered = list.filter((i) => statusOf(i.warrantyEndsAt) !== 'expired')
    return {
      total: list.length,
      covered: covered.length,
      expiring: list.filter((i) => statusOf(i.warrantyEndsAt) === 'expiring').length,
      protectedValue: covered.reduce((sum, i) => sum + (i.price ?? 0), 0),
      nextToExpire: covered[0] ?? null,
    }
  }, [items])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    // TablesDB returns items soonest-expiring first. Show covered items first,
    // then expired ones (most recently expired first).
    const covered = (items ?? []).filter((i) => statusOf(i.warrantyEndsAt) !== 'expired')
    const expired = (items ?? []).filter((i) => statusOf(i.warrantyEndsAt) === 'expired').reverse()
    return [...covered, ...expired].filter((i) => {
      if (category !== 'all' && i.category !== category) return false
      if (status !== 'all' && statusOf(i.warrantyEndsAt) !== status) return false
      if (!q) return true
      return [i.name, i.store, i.serialNumber, i.notes, i.category].some((v) => v?.toLowerCase().includes(q))
    })
  }, [items, search, category, status])

  async function addSamples() {
    if (!user) return
    setSeeding('Creating sample items…')
    try {
      await loadSampleItems(user.$id, (done, total) => setSeeding(`Creating sample items… ${done}/${total}`))
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add sample items.')
    } finally {
      setSeeding(null)
    }
  }

  if (error) {
    return (
      <div className="card mx-auto max-w-lg p-8 text-center">
        <p className="text-lg font-semibold">Something went wrong</p>
        <p className="mt-2 text-sm text-slate-500">{error}</p>
        <button className="btn-primary mt-6" onClick={() => location.reload()}>
          Try again
        </button>
      </div>
    )
  }

  if (!items) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card h-40 animate-pulse bg-slate-100" />
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="card mx-auto max-w-xl px-8 py-14 text-center">
        <div className="text-5xl">🧾</div>
        <h1 className="mt-4 text-2xl font-bold">Your wallet is empty</h1>
        <p className="mx-auto mt-2 max-w-sm text-slate-500">
          Add the things you've bought along with their receipts. We'll keep track of when each warranty runs out.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Link to="/items/new" className="btn-primary">
            + Add your first item
          </Link>
          <button className="btn-secondary" disabled={!!seeding} onClick={addSamples}>
            {seeding ?? 'Load sample items'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Hi{user?.name ? `, ${user.name.split(' ')[0]}` : ''} 👋
          </h1>
          <p className="mt-1 text-slate-500">
            {stats.nextToExpire ? (
              <>
                Next to expire: <strong className="text-slate-700">{stats.nextToExpire.name}</strong> on{' '}
                {formatDate(stats.nextToExpire.warrantyEndsAt)}
              </>
            ) : (
              'None of your warranties are active right now.'
            )}
          </p>
        </div>
        <Link to="/items/new" className="btn-primary">
          + Add item
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Items tracked" value={String(stats.total)} />
        <Stat label="Under warranty" value={String(stats.covered)} accent="text-emerald-600" />
        <Stat label={`Expiring in ${EXPIRING_SOON_DAYS} days`} value={String(stats.expiring)} accent="text-amber-600" />
        <Stat label="Value still covered" value={formatMoney(stats.protectedValue)} accent="text-indigo-600" />
      </div>

      <div className="card space-y-4 p-4">
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">🔍</span>
          <input
            className="input pl-9"
            placeholder="Search by name, store, serial number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
            {STATUS_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setStatus(t.key)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  status === t.key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
          <select
            className="input w-auto"
            value={category}
            onChange={(e) => setCategory(e.target.value as Category | 'all')}
            aria-label="Filter by category"
          >
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_ICONS[c]} {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-12 text-center text-slate-500">No items match your filters.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((item) => (
            <ItemCard key={item.$id} item={item} />
          ))}
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, accent = 'text-slate-900' }: { label: string; value: string; accent?: string }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${accent}`}>{value}</p>
    </div>
  )
}

function ItemCard({ item }: { item: Item }) {
  const status = statusOf(item.warrantyEndsAt)
  const days = daysLeft(item.warrantyEndsAt)
  const progress = progressOf(item)
  return (
    <Link
      to={`/items/${item.$id}`}
      className="card group flex flex-col p-5 transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-slate-100 text-xl">
            {CATEGORY_ICONS[item.category]}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold group-hover:text-indigo-700">{item.name}</p>
            <p className="truncate text-sm text-slate-500">
              {item.store || item.category} · {formatMoney(item.price)}
            </p>
          </div>
        </div>
        {item.receiptFileId && (
          <span title="Receipt saved" className="text-lg">
            🧾
          </span>
        )}
      </div>

      <div className="mt-5">
        <div className="flex items-center justify-between">
          <StatusBadge status={status} />
          <span className="text-sm font-medium text-slate-700">{describeDaysLeft(days)}</span>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <div className={`h-full rounded-full ${STATUS_COLORS[status]}`} style={{ width: `${progress * 100}%` }} />
        </div>
        <p className="mt-2 text-xs text-slate-500">Ends {formatDate(item.warrantyEndsAt)}</p>
      </div>
    </Link>
  )
}
