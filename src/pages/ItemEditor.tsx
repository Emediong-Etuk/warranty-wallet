import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ItemForm, { type ItemFormResult } from '../components/ItemForm'
import { useAuth } from '../lib/auth'
import { createItem, deleteReceipt, getItem, updateItem, uploadReceipt } from '../lib/items'
import type { Item } from '../lib/warranty'

/** Used for both "add item" (/items/new) and "edit item" (/items/:id/edit). */
export default function ItemEditor() {
  const { id } = useParams()
  const isEdit = Boolean(id)
  const { user } = useAuth()
  const navigate = useNavigate()
  const [item, setItem] = useState<Item | null>(null)

  useEffect(() => {
    if (id) getItem(id).then(setItem).catch(() => navigate('/'))
  }, [id, navigate])

  async function save({ input, newReceipt, removeReceipt }: ItemFormResult) {
    if (!user) return
    const oldReceiptId = item?.receiptFileId ?? null
    let receiptFileId = removeReceipt ? null : oldReceiptId

    if (newReceipt) receiptFileId = await uploadReceipt(newReceipt, user.$id)

    const data = { ...input, receiptFileId }
    const saved = isEdit && item ? await updateItem(item.$id, data, user.$id) : await createItem(data, user.$id)

    // Clean up the old file only after the row points at the new one.
    if (oldReceiptId && oldReceiptId !== receiptFileId) await deleteReceipt(oldReceiptId)

    navigate(`/items/${saved.$id}`)
  }

  if (isEdit && !item) return <div className="card h-96 animate-pulse bg-slate-100" />

  return (
    <div className="space-y-6">
      <div>
        <Link to={isEdit ? `/items/${id}` : '/'} className="text-sm font-medium text-slate-500 hover:text-slate-800">
          ← Back
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{isEdit ? 'Edit item' : 'Add an item'}</h1>
      </div>
      <ItemForm
        initial={item ?? undefined}
        submitLabel={isEdit ? 'Save changes' : 'Save item'}
        onSubmit={save}
        onCancel={() => navigate(isEdit ? `/items/${id}` : '/')}
      />
    </div>
  )
}
