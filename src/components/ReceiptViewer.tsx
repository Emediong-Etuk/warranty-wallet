import { useEffect, useState } from 'react'
import { fetchReceipt, type ReceiptBlob } from '../lib/items'

export default function ReceiptViewer({ fileId, className = '' }: { fileId: string; className?: string }) {
  const [receipt, setReceipt] = useState<ReceiptBlob | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    let url: string | null = null
    let cancelled = false
    fetchReceipt(fileId)
      .then((r) => {
        url = r.url
        if (cancelled) URL.revokeObjectURL(r.url)
        else setReceipt(r)
      })
      .catch(() => !cancelled && setError(true))
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [fileId])

  if (error) {
    return <div className={`grid place-items-center text-sm text-slate-500 ${className}`}>Couldn't load the receipt.</div>
  }
  if (!receipt) {
    return <div className={`animate-pulse bg-slate-100 ${className}`} />
  }
  if (receipt.mimeType === 'application/pdf') {
    return (
      <div className={`flex flex-col ${className}`}>
        <iframe src={receipt.url} title="Receipt" className="min-h-[480px] w-full flex-1 rounded-lg" />
        <a href={receipt.url} target="_blank" rel="noreferrer" className="btn-secondary mt-3">
          Open PDF in new tab
        </a>
      </div>
    )
  }
  return (
    <a href={receipt.url} target="_blank" rel="noreferrer" title="Open full size">
      <img src={receipt.url} alt="Receipt" className={`object-contain ${className}`} />
    </a>
  )
}
