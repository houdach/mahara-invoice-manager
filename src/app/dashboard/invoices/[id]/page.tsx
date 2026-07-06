'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { InvoicePDFTemplate } from '@/components/InvoicePDF'

type Invoice = {
  id: string
  number: string
  date: string
  updated_at: string
  status: string
  total: number
  total_paid: number
  remaining: number
  created_by?: string
  clients: { id: string; name: string; phone?: string; city?: string }
  invoice_items: { id: string; photo_base64: string | null; quantity: number; unit_price: number; note?: string }[]
  payments: { id: string; amount: number; date: string; origine?: string; note?: string }[]
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
  const { data: session } = useSession()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [sharing, setSharing] = useState(false)

  const role = (session?.user as any)?.role
  const userName = session?.user?.name

  const canEdit = role === 'admin' || (role === 'worker' && invoice?.created_by === userName)

  async function fetchInvoice() {
    const res = await fetch(`/api/invoices/${id}`)
    const data = await res.json()
    setInvoice(data)
    setLoading(false)
  }

  useEffect(() => { fetchInvoice() }, [id])

  // ── PRINT ──
  // Desktop: CSS visibility trick — hides everything except the invoice template.
  // Mobile: opens a new window with the invoice HTML at fixed 794px width so
  //         it renders correctly and isn't squashed to the mobile viewport width.
  function handlePrint() {
    const element = document.getElementById('invoice-pdf-template')
    if (!element) return

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

    if (isMobile) {
      const printWindow = window.open('', '_blank')
      if (!printWindow) return

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=794">
            <title>Facture ${invoice!.number}</title>
            <style>
              * { margin: 0; padding: 0; box-sizing: border-box; }
              @page { margin: 0; size: A4 portrait; }
              html, body { width: 794px; margin: 0; padding: 0; background: white; }
              #invoice-pdf-template { width: 794px !important; }
            </style>
          </head>
          <body>
            ${element.outerHTML}
          </body>
        </html>
      `)
      printWindow.document.close()
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.focus()
          printWindow.print()
          printWindow.close()
        }, 800)
      }
    } else {
      window.print()
    }
  }

  // ── WHATSAPP SHARE ──
  // Mobile: Web Share API shares the PDF file directly to WhatsApp.
  // Desktop: downloads PDF + opens WhatsApp Web with pre-filled message.
  async function handleWhatsApp() {
    if (!invoice) return
    setSharing(true)

    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: html2canvas } = await import('html2canvas')

      const element = document.getElementById('invoice-pdf-template')
      if (!element) { setSharing(false); return }

      const images = element.querySelectorAll('img')
      await Promise.all(Array.from(images).map((img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalHeight !== 0) { resolve(); return }
          img.onload = () => resolve()
          img.onerror = () => resolve()
        })
      ))
      await new Promise((r) => setTimeout(r, 150))

      const canvas = await html2canvas(element, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 0,
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST')

      const pdfBlob = pdf.output('blob')
      const fileName = `Facture_${invoice.number}.pdf`
      const file = new File([pdfBlob], fileName, { type: 'application/pdf' })

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)

      if (isMobile && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Facture ${invoice.number} — Mahara Style`,
        })
      } else {
        // Open blank window NOW — Chrome expires user gesture after any await
        const waWindow = window.open('', '_blank')

        const url = URL.createObjectURL(pdfBlob)
        const a = document.createElement('a')
        a.href = url
        a.download = fileName
        a.click()
        URL.revokeObjectURL(url)

        const rawPhone = invoice.clients?.phone || ''
        const phone = rawPhone.replace(/\s/g, '').replace(/^0/, '212').replace(/^\+/, '')

        const message = encodeURIComponent(
          `Bonjour,\n\nVeuillez trouver ci-joint votre facture Mahara Style.\n\n` +
          `N° : ${invoice.number}\n` +
          `Total : ${Number(invoice.total).toLocaleString('fr-MA')} DH\n` +
          (invoice.total_paid > 0 ? `Payé : ${Number(invoice.total_paid).toLocaleString('fr-MA')} DH\n` : '') +
          (invoice.remaining > 0 ? `Reste à payer : ${Number(invoice.remaining).toLocaleString('fr-MA')} DH\n` : 'Facture soldée ✓\n') +
          `\nMerci de votre confiance.`
        )

        const waUrl = phone
          ? `https://wa.me/${phone}?text=${message}`
          : `https://wa.me/?text=${message}`

        if (waWindow) {
          waWindow.location.href = waUrl
        } else {
          window.open(waUrl, '_blank')
        }
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('WhatsApp share error:', err)
      }
    }

    setSharing(false)
  }

  const wasEdited = invoice?.updated_at &&
    new Date(invoice.updated_at).getTime() > new Date(invoice.date).getTime() + 60_000

  if (loading) return (
    <div className="flex items-center justify-center h-64" style={{ color: '#BF984D' }}>
      Chargement...
    </div>
  )

  if (!invoice) return (
    <div className="text-center py-16" style={{ color: '#702434' }}>Facture introuvable</div>
  )

  return (
    <>
      {/* Desktop print styles — mobile uses new window approach instead */}
      <style>{`
        @page { margin: 0 !important; size: A4 portrait; }
        @media print {
          body * { visibility: hidden !important; }
          #invoice-pdf-template,
          #invoice-pdf-template * { visibility: visible !important; }
          #invoice-pdf-template {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            z-index: 9999 !important;
          }
        }
      `}</style>

      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-start gap-4">
          <button onClick={() => router.back()} style={{ color: '#BF984D' }} className="mt-1 flex-shrink-0">
            ← Retour
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold" style={{ color: '#702434', fontFamily: 'Playfair Display, serif' }}>
                  {invoice.number}
                </h1>
                <span className="px-3 py-1 rounded-full text-xs font-semibold"
                  style={{ color: statusColors[invoice.status], backgroundColor: statusBg[invoice.status] }}>
                  {invoice.status}
                </span>
                {invoice.created_by && (
                  <span className="px-3 py-1 rounded-full text-xs" style={{ backgroundColor: '#f5f5f5', color: '#666' }}>
                    Par {invoice.created_by}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {canEdit && (
                  <Link
                    href={`/dashboard/invoices/new?edit=${invoice.id}`}
                    className="px-4 py-2 rounded-xl text-sm font-semibold transition"
                    style={{ backgroundColor: '#702434', color: 'white' }}
                  >
                    ✎ Modifier
                  </Link>
                )}
                <button
                  onClick={handlePrint}
                  className="px-4 py-2 rounded-xl text-sm font-semibold border transition"
                  style={{ borderColor: '#BF984D55', color: '#702434', backgroundColor: 'white' }}
                >
                  🖨 Imprimer
                </button>
                <button
                  onClick={handleWhatsApp}
                  disabled={sharing}
                  className="px-4 py-2 rounded-xl text-sm font-semibold transition text-white"
                  style={{ backgroundColor: sharing ? '#aaa' : '#25D366' }}
                >
                  {sharing ? 'Envoi...' : '📤 WhatsApp'}
                </button>
              </div>
            </div>

            <p className="text-sm mt-1" style={{ color: '#999' }}>
              Client : <span style={{ color: '#702434', fontWeight: 600 }}>{invoice.clients?.name}</span>
              {invoice.clients?.city && ` · ${invoice.clients.city}`}
            </p>
          </div>
        </div>

        {/* Info card */}
        <div className="bg-white rounded-2xl border p-6 grid grid-cols-1 sm:grid-cols-3 gap-4" style={{ borderColor: '#BF984D22' }}>
          <div>
            <p className="text-xs mb-1" style={{ color: '#999' }}>Date de la facture</p>
            <p className="font-medium text-sm" style={{ color: '#702434' }}>
              {new Date(invoice.date).toLocaleDateString('fr-MA')}
            </p>
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: '#999' }}>Dernière modification</p>
            <p className="font-medium text-sm" style={{ color: wasEdited ? '#702434' : '#999' }}>
              {wasEdited
                ? new Date(invoice.updated_at).toLocaleDateString('fr-MA') + ' à ' +
                  new Date(invoice.updated_at).toLocaleTimeString('fr-MA', { hour: '2-digit', minute: '2-digit' })
                : 'Jamais modifiée'}
            </p>
          </div>
          <div>
            <p className="text-xs mb-1" style={{ color: '#999' }}>Total TTC</p>
            <p className="font-bold" style={{ color: '#702434' }}>
              {Number(invoice.total).toLocaleString('fr-MA')} DH
            </p>
          </div>
        </div>

        {/* Articles */}
        <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#BF984D22' }}>
          <h2 className="font-semibold mb-4" style={{ color: '#702434' }}>Articles</h2>
          <div className="space-y-3">
            {invoice.invoice_items.map((item) => (
              <div key={item.id} className="flex items-center gap-4 p-3 rounded-xl" style={{ backgroundColor: '#FAF3EE55' }}>
                {item.photo_base64 ? (
                  <img src={item.photo_base64} className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                    style={{ border: '1px solid #BF984D33' }} alt="" />
                ) : (
                  <div className="w-16 h-16 rounded-lg flex items-center justify-center flex-shrink-0 text-2xl"
                    style={{ backgroundColor: '#FAF3EE', border: '1px solid #BF984D33' }}>📷</div>
                )}
                <div className="flex-1 min-w-0">
                  {item.note && (
                    <p className="text-sm font-medium mb-0.5" style={{ color: '#702434' }}>{item.note}</p>
                  )}
                  <p className="text-sm" style={{ color: '#999' }}>
                    {item.quantity} × {Number(item.unit_price).toLocaleString('fr-MA')} DH
                  </p>
                </div>
                <p className="font-semibold text-sm flex-shrink-0" style={{ color: '#702434' }}>
                  {(item.quantity * item.unit_price).toLocaleString('fr-MA')} DH
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Payments */}
        <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#BF984D22' }}>
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-semibold" style={{ color: '#702434' }}>Paiements</h2>
            {invoice.status !== 'Soldé' && canEdit && (
              <button onClick={() => setShowPaymentForm(true)}
                className="px-4 py-2 rounded-xl text-white text-sm font-semibold"
                style={{ backgroundColor: '#702434' }}>
                + Ajouter un paiement
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6 p-4 rounded-xl" style={{ backgroundColor: '#FAF3EE' }}>
            <div>
              <p className="text-xs mb-1" style={{ color: '#999' }}>Total facture</p>
              <p className="font-bold" style={{ color: '#702434' }}>{Number(invoice.total).toLocaleString('fr-MA')} DH</p>
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: '#999' }}>Total payé</p>
              <p className="font-bold" style={{ color: '#2d7a4f' }}>{invoice.total_paid.toLocaleString('fr-MA')} DH</p>
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: '#999' }}>Reste à payer</p>
              <p className="font-bold" style={{ color: invoice.remaining > 0 ? '#BF984D' : '#2d7a4f' }}>
                {invoice.remaining.toLocaleString('fr-MA')} DH
              </p>
            </div>
          </div>

          {invoice.payments.length === 0 ? (
            <div className="text-center py-8" style={{ color: '#999' }}>
              <p className="text-2xl mb-2">💳</p>
              <p className="text-sm">Aucun paiement enregistré</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="hidden sm:grid grid-cols-5 px-3 pb-2 border-b" style={{ borderColor: '#BF984D22' }}>
                {['Date', 'Montant', 'Origine', 'Note', 'Cumulé'].map((h) => (
                  <p key={h} className="text-xs font-medium" style={{ color: '#999' }}>{h}</p>
                ))}
              </div>
              {[...invoice.payments]
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map((payment, index, sorted) => {
                  const runningTotal = sorted
                    .slice(0, index + 1)
                    .reduce((sum, p) => sum + Number(p.amount), 0)
                  return (
                    <div key={payment.id} className="grid grid-cols-2 sm:grid-cols-5 gap-2 px-3 py-3 rounded-xl hover:bg-orange-50 transition">
                      <p className="text-sm" style={{ color: '#702434' }}>
                        {new Date(payment.date).toLocaleDateString('fr-MA')}
                      </p>
                      <p className="text-sm font-semibold" style={{ color: '#2d7a4f' }}>
                        +{Number(payment.amount).toLocaleString('fr-MA')} DH
                      </p>
                      <p className="text-sm" style={{ color: '#702434' }}>{payment.origine || '—'}</p>
                      <p className="text-sm" style={{ color: '#999' }}>{payment.note || '—'}</p>
                      <p className="text-xs sm:text-right" style={{ color: '#BF984D' }}>
                        Cumulé: {runningTotal.toLocaleString('fr-MA')} DH
                      </p>
                    </div>
                  )
                })}
            </div>
          )}
        </div>

        {showPaymentForm && (
          <AddPaymentModal
            remaining={invoice.remaining}
            invoiceId={invoice.id}
            onClose={() => setShowPaymentForm(false)}
            onAdded={() => { setShowPaymentForm(false); fetchInvoice() }}
          />
        )}

        {/* Hidden invoice template — used for print (mobile) and WhatsApp PDF */}
        <div style={{ position: 'absolute', left: '-9999px', top: 0, zIndex: -1 }}>
          <InvoicePDFTemplate invoice={invoice} />
        </div>
      </div>
    </>
  )
}

function AddPaymentModal({ remaining, invoiceId, onClose, onAdded }: {
  remaining: number
  invoiceId: string
  onClose: () => void
  onAdded: () => void
}) {
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [origine, setOrigine] = useState('')
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
      body: JSON.stringify({ amount: Number(amount), date, origine, note }),
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: '#00000055' }}>
      <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 w-full max-w-md">
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
            <input type="number" min="1" max={remaining} value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border outline-none"
              style={{ borderColor: '#BF984D55', backgroundColor: '#FAF3EE' }} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#702434' }}>Date *</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border outline-none"
              style={{ borderColor: '#BF984D55', backgroundColor: '#FAF3EE' }} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#702434' }}>Origine</label>
            <select value={origine} onChange={(e) => setOrigine(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border outline-none"
              style={{ borderColor: '#BF984D55', backgroundColor: '#FAF3EE' }}>
              <option value="">Sélectionner...</option>
              <option value="Espèces">Espèces</option>
              <option value="Chèque">Chèque</option>
              <option value="Virement">Virement</option>
              <option value="Carte bancaire">Carte bancaire</option>
              <option value="Autre">Autre</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#702434' }}>Note (optionnel)</label>
            <input type="text" placeholder="Référence, détail..." value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border outline-none"
              style={{ borderColor: '#BF984D55', backgroundColor: '#FAF3EE' }} />
          </div>
        </div>

        {error && <p className="text-sm text-red-600 mt-3">{error}</p>}

        <div className="flex gap-3 mt-6">
          <button onClick={onClose}
            className="flex-1 py-3 rounded-xl border text-sm font-medium"
            style={{ borderColor: '#BF984D55', color: '#702434' }}>
            Annuler
          </button>
          <button onClick={handleSubmit} disabled={loading}
            className="flex-1 py-3 rounded-xl text-white text-sm font-semibold"
            style={{ backgroundColor: '#702434' }}>
            {loading ? 'Enregistrement...' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}