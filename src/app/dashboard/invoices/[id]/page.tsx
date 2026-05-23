'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { InvoicePDFTemplate } from '@/components/InvoicePDF'
import { generateInvoicePDF } from '@/lib/generatePDF'

type Invoice = {
  id: string
  number: string
  date: string
  validity: string
  status: string
  total: number
  total_paid: number
  remaining: number
  clients: { id: string; name: string; phone?: string; city?: string }
  invoice_items: { id: string; photo_base64: string | null; quantity: number; unit_price: number }[]
  payments: { id: string; amount: number; date: string; note?: string }[]
}

const statusColors: Record<string, string> = {
  'En attente': '#999',
  'Partiel': '#BF984D',
  'Soldé': '#2d7a4f',
}

const statusBg: Record<string, string> = {
  'En attente': '#f5f5f5',
  'Partiel': '#BF984D22',
  'Soldé': '#2d7a4f22',
}

export default function InvoiceDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [exporting, setExporting] = useState(false)

  async function fetchInvoice() {
    const res = await fetch(`/api/invoices/${id}`)
    const data = await res.json()
    setInvoice(data)
    setLoading(false)
  }

  useEffect(() => { fetchInvoice() }, [id])

  async function handleExport() {
    if (!invoice) return
    setExporting(true)
    await generateInvoicePDF(invoice.number)
    setExporting(false)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64" style={{ color: '#BF984D' }}>
      Chargement...
    </div>
  )

  if (!invoice) return (
    <div className="text-center py-16" style={{ color: '#702434' }}>Facture introuvable</div>
  )

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} style={{ color: '#BF984D' }}>← Retour</button>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold" style={{ color: '#702434', fontFamily: 'Playfair Display, serif' }}>
                {invoice.number}
              </h1>
              <span
                className="px-3 py-1 rounded-full text-xs font-semibold"
                style={{ color: statusColors[invoice.status], backgroundColor: statusBg[invoice.status] }}
              >
                {invoice.status}
              </span>
            </div>
            {/* PDF export button */}
            <button
              onClick={handleExport}
              disabled={exporting}
              className="px-4 py-2 rounded-xl text-sm font-semibold border transition"
              style={{ borderColor: '#BF984D55', color: '#702434', backgroundColor: 'white' }}
            >
              {exporting ? 'Export...' : '⬇ PDF'}
            </button>
          </div>
          <p className="text-sm mt-1" style={{ color: '#999' }}>
            Client : <span style={{ color: '#702434', fontWeight: 600 }}>{invoice.clients?.name}</span>
            {invoice.clients?.city && ` · ${invoice.clients.city}`}
          </p>
        </div>
      </div>

      {/* Invoice info card */}
      <div className="bg-white rounded-2xl border p-6 grid grid-cols-3 gap-4" style={{ borderColor: '#BF984D22' }}>
        <div>
          <p className="text-xs mb-1" style={{ color: '#999' }}>Date</p>
          <p className="font-medium text-sm" style={{ color: '#702434' }}>
            {new Date(invoice.date).toLocaleDateString('fr-MA')}
          </p>
        </div>
        <div>
          <p className="text-xs mb-1" style={{ color: '#999' }}>Validité</p>
          <p className="font-medium text-sm" style={{ color: '#702434' }}>
            {new Date(invoice.validity).toLocaleDateString('fr-MA')}
          </p>
        </div>
        <div>
          <p className="text-xs mb-1" style={{ color: '#999' }}>Total TTC</p>
          <p className="font-bold" style={{ color: '#702434' }}>
            {Number(invoice.total).toLocaleString('fr-MA')} DH
          </p>
        </div>
      </div>

      {/* Line items */}
      <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#BF984D22' }}>
        <h2 className="font-semibold mb-4" style={{ color: '#702434' }}>Articles</h2>
        <div className="space-y-3">
          {invoice.invoice_items.map((item) => (
            <div key={item.id} className="flex items-center gap-4 p-3 rounded-xl"
              style={{ backgroundColor: '#FAF3EE55' }}>
              {item.photo_base64 ? (
                <img
                  src={item.photo_base64}
                  className="w-14 h-14 rounded-lg object-cover flex-shrink-0"
                  style={{ border: '1px solid #BF984D33' }}
                />
              ) : (
                <div
                  className="w-14 h-14 rounded-lg flex items-center justify-center flex-shrink-0 text-2xl"
                  style={{ backgroundColor: '#FAF3EE', border: '1px solid #BF984D33' }}
                >
                  📷
                </div>
              )}
              <div className="flex-1">
                <p className="text-sm" style={{ color: '#999' }}>
                  {item.quantity} × {Number(item.unit_price).toLocaleString('fr-MA')} DH
                </p>
              </div>
              <p className="font-semibold text-sm" style={{ color: '#702434' }}>
                {(item.quantity * item.unit_price).toLocaleString('fr-MA')} DH
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Payments section */}
      <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#BF984D22' }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-semibold" style={{ color: '#702434' }}>Paiements</h2>
          {invoice.status !== 'Soldé' && (
            <button
              onClick={() => setShowPaymentForm(true)}
              className="px-4 py-2 rounded-xl text-white text-sm font-semibold"
              style={{ backgroundColor: '#702434' }}
            >
              + Ajouter un paiement
            </button>
          )}
        </div>

        {/* Balance summary */}
        <div className="grid grid-cols-3 gap-4 mb-6 p-4 rounded-xl" style={{ backgroundColor: '#FAF3EE' }}>
          <div>
            <p className="text-xs mb-1" style={{ color: '#999' }}>Total facture</p>
            <p className="font-bold" style={{ color: '#702434' }}>
              {Number(invoice.total).toLocaleString('fr-MA')} DH
            </p>
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: '#999' }}>Total payé</p>
            <p className="font-bold" style={{ color: '#2d7a4f' }}>
              {invoice.total_paid.toLocaleString('fr-MA')} DH
            </p>
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: '#999' }}>Reste à payer</p>
            <p className="font-bold" style={{ color: invoice.remaining > 0 ? '#BF984D' : '#2d7a4f' }}>
              {invoice.remaining.toLocaleString('fr-MA')} DH
            </p>
          </div>
        </div>

        {/* Payments table */}
        {invoice.payments.length === 0 ? (
          <div className="text-center py-8" style={{ color: '#999' }}>
            <p className="text-2xl mb-2">💳</p>
            <p className="text-sm">Aucun paiement enregistré</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-4 px-3 pb-2 border-b" style={{ borderColor: '#BF984D22' }}>
              {['Date', 'Montant', 'Note', ''].map((h) => (
                <p key={h} className="text-xs font-medium" style={{ color: '#999' }}>{h}</p>
              ))}
            </div>
            {invoice.payments
              .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
              .map((payment, index) => {
                const runningTotal = invoice.payments
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .slice(0, index + 1)
                  .reduce((sum, p) => sum + Number(p.amount), 0)
                return (
                  <div key={payment.id} className="grid grid-cols-4 items-center px-3 py-3 rounded-xl hover:bg-orange-50 transition">
                    <p className="text-sm" style={{ color: '#702434' }}>
                      {new Date(payment.date).toLocaleDateString('fr-MA')}
                    </p>
                    <p className="text-sm font-semibold" style={{ color: '#2d7a4f' }}>
                      +{Number(payment.amount).toLocaleString('fr-MA')} DH
                    </p>
                    <p className="text-sm" style={{ color: '#999' }}>{payment.note || '—'}</p>
                    <p className="text-xs text-right" style={{ color: '#BF984D' }}>
                      Cumulé: {runningTotal.toLocaleString('fr-MA')} DH
                    </p>
                  </div>
                )
              })}
          </div>
        )}
      </div>

      {/* Add payment modal */}
      {showPaymentForm && (
        <AddPaymentModal
          invoiceTotal={Number(invoice.total)}
          remaining={invoice.remaining}
          invoiceId={invoice.id}
          onClose={() => setShowPaymentForm(false)}
          onAdded={() => {
            setShowPaymentForm(false)
            fetchInvoice()
          }}
        />
      )}

      {/* Hidden PDF template — off-screen, used only for export */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0, zIndex: -1 }}>
        <InvoicePDFTemplate invoice={invoice} />
      </div>
    </div>
  )
}

function AddPaymentModal({
  invoiceTotal,
  remaining,
  invoiceId,
  onClose,
  onAdded,
}: {
  invoiceTotal: number
  remaining: number
  invoiceId: string
  onClose: () => void
  onAdded: () => void
}) {
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!amount || Number(amount) <= 0) { setError('Montant invalide'); return }
    if (Number(amount) > remaining) {
      setError(`Le montant dépasse le reste à payer (${remaining.toLocaleString('fr-MA')} DH)`)
      return
    }
    setLoading(true)
    const res = await fetch(`/api/invoices/${invoiceId}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: Number(amount), date, note }),
    })
    if (res.ok) {
      onAdded()
    } else {
      const data = await res.json()
      setError(data.error || 'Erreur')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: '#00000055' }}>
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold" style={{ color: '#702434', fontFamily: 'Playfair Display, serif' }}>
            Ajouter un paiement
          </h2>
          <button onClick={onClose} style={{ color: '#999' }}>✕</button>
        </div>

        <div className="p-3 rounded-xl mb-5 text-sm" style={{ backgroundColor: '#FAF3EE', color: '#702434' }}>
          Reste à payer : <strong>{remaining.toLocaleString('fr-MA')} DH</strong>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#702434' }}>Montant (DH) *</label>
            <input
              type="number" min="1" max={remaining} value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border outline-none"
              style={{ borderColor: '#BF984D55', backgroundColor: '#FAF3EE' }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#702434' }}>Date *</label>
            <input
              type="date" value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border outline-none"
              style={{ borderColor: '#BF984D55', backgroundColor: '#FAF3EE' }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#702434' }}>Note (optionnel)</label>
            <input
              type="text" placeholder="Ex: Virement, espèces..." value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border outline-none"
              style={{ borderColor: '#BF984D55', backgroundColor: '#FAF3EE' }}
            />
          </div>
        </div>

        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border text-sm font-medium"
            style={{ borderColor: '#BF984D55', color: '#702434' }}
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit} disabled={loading}
            className="flex-1 py-3 rounded-xl text-white text-sm font-semibold"
            style={{ backgroundColor: '#702434' }}
          >
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}