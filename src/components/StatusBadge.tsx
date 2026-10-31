import type { WarrantyStatus } from '../lib/warranty'

const STYLES: Record<WarrantyStatus, { label: string; className: string; dot: string }> = {
  active: { label: 'Under warranty', className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', dot: 'bg-emerald-500' },
  expiring: { label: 'Expiring soon', className: 'bg-amber-50 text-amber-800 ring-amber-600/20', dot: 'bg-amber-500' },
  expired: { label: 'Expired', className: 'bg-red-50 text-red-700 ring-red-600/20', dot: 'bg-red-500' },
}

export const STATUS_COLORS: Record<WarrantyStatus, string> = {
  active: 'bg-emerald-500',
  expiring: 'bg-amber-500',
  expired: 'bg-red-500',
}

export default function StatusBadge({ status, large = false }: { status: WarrantyStatus; large?: boolean }) {
  const s = STYLES[status]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ring-1 ring-inset ${s.className} ${
        large ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}
