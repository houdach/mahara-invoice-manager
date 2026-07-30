'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

// --- Types ---
type Client = { id: string; name: string; city?: string; phone?: string }
type Item = {
  photo_base64: string | null
  photo_url: string | null
  quantity: number
  unit_price: number
  note: string
  preview: string | null
}
type Payment = { amount: number; date: string; origine: string; note: string }

function today() {
  return new Date().toISOString().split('T')[0]
}

export default function InvoiceBuilderPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // --- Mode detection ---
  const editId = searchParams.get('edit')
  const isEditMode = !!editId

  // --- Client state ---
  const [clientName, setClientName] = useState('')
  const [clientId, setClientId] = useState<string | null>(null)
  const [clientPhone, setClientPhone] = useState('')
  const [clientCity, setClientCity] = useState('')
  const [suggestions, setSuggestions] = useState<Client[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isNewClient, setIsNewClient] = useState(false)

  // --- Invoice state ---
  const [date, setDate] = useState(today())
  const [items, setItems] = useState<Item[]>([
    { photo_base64: null, photo_url: null, quantity: 1, unit_price: 0, note: '', preview: null }
  ])

  // --- Initial payments (CREATE mode only) ---
  const [initialPayments, setInitialPayments] = useState<Payment[]>([])
  const [showPaymentSection, setShowPaymentSection] = useState(false)

  // --- Payments in EDIT mode ---
  // Existing payments are loaded read-only from the DB, just for visibility.
  // New payments are queued in memory and POSTed individually on save.
  const [existingPayments, setExistingPayments] = useState<any[]>([])
  const [newPayments, setNewPayments] = useState<Payment[]>([])
  const [showNewPaymentForm, setShowNewPaymentForm] = useState(false)

  const [saving, setSaving] = useState(false)
  const [loadingInvoice, setLoadingInvoice] = useState(isEditMode)
  const [error, setError] = useState('')

  // --- Load existing invoice in edit mode ---
  useEffect(() => {
    if (!editId) return
    fetch(`/api/invoices/${editId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.clients) {
          setClientName(data.clients.name)
          setClientId(data.clients.id)
          setClientPhone(data.clients.phone || '')
          setClientCity(data.clients.city || '')
          setIsNewClient(false)
        }
        setDate(data.date)

        if (data.invoice_items?.length) {
          setItems(
            data.invoice_items.map((item: any) => ({
              photo_base64: item.photo_base64,
              photo_url: item.photo_url ?? null,
              quantity: item.quantity,
              unit_price: Number(item.unit_price),
              note: item.note || '',
              preview: item.photo_base64,
            }))
          )
        }
        // Load existing payments for read-only display
        if (data.payments?.length) {
          setExistingPayments(
            [...data.payments].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          )
        }

        setLoadingInvoice(false)
      })
      .catch(() => setLoadingInvoice(false))
  }, [editId])

  // --- Prefill from clients page (only in create mode) ---
  useEffect(() => {
    if (isEditMode) return
    const prefilledId = searchParams.get('clientId')
    const prefilledName = searchParams.get('clientName')
    if (prefilledId && prefilledName) {
      setClientName(decodeURIComponent(prefilledName))
      setClientId(prefilledId)
      setIsNewClient(false)
    }
  }, [])

  // --- Client autocomplete (only in create mode) ---
  useEffect(() => {
    if (isEditMode || clientName.length < 1) {
      setSuggestions([])
      return
    }
    const timeout = setTimeout(async () => {
      const res = await fetch(`/api/clients/search?q=${encodeURIComponent(clientName)}`)
      const data = await res.json()
      setSuggestions(data)
      setShowSuggestions(true)
    }, 300)
    return () => clearTimeout(timeout)
  }, [clientName, isEditMode])

  function selectClient(client: Client) {
    setClientName(client.name)
    setClientId(client.id)
    setClientPhone(client.phone || '')
    setClientCity(client.city || '')
    setIsNewClient(false)
    setShowSuggestions(false)
    setSuggestions([])
  }

  function handleClientType(val: string) {
    setClientName(val)
    setClientId(null)
    setIsNewClient(true)
  }

  // --- Item helpers ---
  function addItem() {
    setItems([...items, { photo_base64: null, photo_url: null, quantity: 1, unit_price: 0, note: '', preview: null }])
  }
  function removeItem(i: number) {
    setItems(items.filter((_, idx) => idx !== i))
  }
  function updateItem(i: number, field: keyof Item, value: any) {
    setItems(items.map((item, idx) => (idx === i ? { ...item, [field]: value } : item)))
  }
  function handlePhoto(i: number, file: File) {
    const reader = new FileReader()
    reader.onload = (e) => {
      // Compress photo before storing as base64.
      // Raw photos can be 1-2MB which causes Chrome to hang on large POST requests.
      // We resize to max 800px and compress to 60% JPEG — still looks good in the
      // invoice but reduces payload from ~1MB to ~80KB.
      const img = new window.Image()
      img.onload = async () => {
        const MAX = 800
        const ratio = Math.min(MAX / img.width, MAX / img.height, 1)
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * ratio)
        canvas.height = Math.round(img.height * ratio)
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        const compressed = canvas.toDataURL('image/jpeg', 0.6)

        // Set base64 + preview immediately so the UI feels instant
        setItems((prev) =>
          prev.map((item, idx) =>
            idx === i ? { ...item, photo_base64: compressed, preview: compressed } : item
          )
        )

        // Upload to Supabase Storage in the background to get a public URL.
        // The URL is stored in photo_url so the PDF can show a clickable link.
        try {
          const blob = await (await fetch(compressed)).blob()
          const fileName = `items/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
          const { createClient } = await import('@supabase/supabase-js')
          const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
          )
          const { error: uploadError } = await supabase.storage
            .from('invoice-photos')
            .upload(fileName, blob, { contentType: 'image/jpeg', upsert: false })
          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from('invoice-photos')
              .getPublicUrl(fileName)
            setItems((prev) =>
              prev.map((item, idx) =>
                idx === i ? { ...item, photo_url: urlData.publicUrl } : item
              )
            )
          }
        } catch (_) {
          // Upload failed silently — photo still shows in invoice, just no clickable link
        }
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  // --- Initial payment helpers (CREATE mode) ---
  function addPayment() {
    setInitialPayments([...initialPayments, { amount: 0, date: today(), origine: '', note: '' }])
  }
  function updatePayment(i: number, field: keyof Payment, value: any) {
    setInitialPayments(initialPayments.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)))
  }
  function removePayment(i: number) {
    setInitialPayments(initialPayments.filter((_, idx) => idx !== i))
  }

  // --- New payment helpers (EDIT mode) ---
  function addNewPayment() {
    setNewPayments([...newPayments, { amount: 0, date: today(), origine: '', note: '' }])
  }
  function updateNewPayment(i: number, field: keyof Payment, value: any) {
    setNewPayments(newPayments.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)))
  }
  function removeNewPayment(i: number) {
    setNewPayments(newPayments.filter((_, idx) => idx !== i))
  }

  // Save each new payment via the payments API. The endpoint handles status recalc.
  async function saveNewPayments(invoiceId: string) {
    const validPayments = newPayments.filter((p) => p.amount > 0)
    for (const p of validPayments) {
      await fetch(`/api/invoices/${invoiceId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(p),
      })
    }
  }

  const total = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
  const totalInitiallyPaid = initialPayments.reduce((sum, p) => sum + Number(p.amount), 0)
  const totalAlreadyPaid = existingPayments.reduce((s, p) => s + Number(p.amount), 0)
  const totalNewPayments = newPayments.reduce((s, p) => s + Number(p.amount), 0)
  const remainingAfterEdit = total - totalAlreadyPaid - totalNewPayments

  // --- Save handler ---
  async function handleSave() {
    if (!clientName) { setError('Veuillez entrer un nom de client'); return }
    if (items.some((i) => i.unit_price === 0)) { setError('Veuillez entrer un prix pour chaque article'); return }
    if (!isEditMode && totalInitiallyPaid > total) {
      setError('Le total des paiements dépasse le montant de la facture'); return
    }
    if (isEditMode && totalAlreadyPaid + totalNewPayments > total) {
      setError(`Le total payé (${(totalAlreadyPaid + totalNewPayments).toLocaleString('fr-MA')} DH) dépasse le total facture`); return
    }

    setSaving(true)
    setError('')

    const validity = date

    if (isEditMode) {
      const res = await fetch(`/api/invoices/${editId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, validity, items }),
      })
      if (res.ok) {
        await saveNewPayments(editId)
        router.push(`/dashboard/invoices/${editId}`)
      } else {
        const data = await res.json()
        setError(data.error || 'Erreur lors de la modification')
        setSaving(false)
      }
    } else {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName,
          clientId,
          clientPhone: isNewClient ? clientPhone : undefined,
          clientCity: isNewClient ? clientCity : undefined,
          date,
          validity,
          items,
          initialPayments: initialPayments.filter((p) => p.amount > 0),
        }),
      })
      if (res.ok) {
        const invoice = await res.json()
        router.push(`/dashboard/invoices/${invoice.id}`)
      } else {
        const data = await res.json()
        setError(data.error || 'Erreur lors de la création')
        setSaving(false)
      }
    }
  }

  if (loadingInvoice) {
    return (
      <div className="flex items-center justify-center h-64" style={{ color: '#BF984D' }}>
        Chargement de la facture...
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-2 sm:px-0">

      {/* Header */}
      <div className="flex items-center gap-4 mb-4 sm:mb-8">
        <button onClick={() => router.back()} style={{ color: '#BF984D' }}>← Retour</button>
        <h1 className="text-2xl font-bold" style={{ color: '#702434', fontFamily: 'Playfair Display, serif' }}>
          {isEditMode ? 'Modifier la facture' : 'Nouvelle facture'}
        </h1>
      </div>

      <div className="bg-white rounded-2xl border p-4 sm:p-8 space-y-6 sm:space-y-8" style={{ borderColor: '#BF984D22' }}>

        {/* ── Client ── */}
        <div>
          <h2 className="font-semibold mb-4" style={{ color: '#702434' }}>Client</h2>
          <div className="relative">
            <input
              type="text"
              placeholder="Nom du client..."
              value={clientName}
              onChange={(e) => !isEditMode && !clientId && handleClientType(e.target.value)}
              onFocus={() => !isEditMode && !clientId && suggestions.length > 0 && setShowSuggestions(true)}
              readOnly={isEditMode || !!clientId}
              className="w-full px-4 py-3 rounded-xl border outline-none"
              style={{
                borderColor: '#BF984D55',
                backgroundColor: (isEditMode || clientId) ? '#F0E8E0' : '#FAF3EE',
                cursor: (isEditMode || clientId) ? 'default' : 'text',
              }}
            />
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border rounded-xl shadow-lg z-10 mt-1 overflow-hidden" style={{ borderColor: '#BF984D33' }}>
                {suggestions.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => selectClient(c)}
                    className="w-full text-left px-4 py-3 hover:bg-orange-50 transition flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: '#702434' }}>
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-sm" style={{ color: '#702434' }}>{c.name}</p>
                      {c.city && <p className="text-xs" style={{ color: '#999' }}>{c.city}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {!isEditMode && isNewClient && clientName.length > 1 && suggestions.length === 0 && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                placeholder="Téléphone (optionnel)"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                className="px-4 py-3 rounded-xl border outline-none text-sm"
                style={{ borderColor: '#BF984D55', backgroundColor: '#FAF3EE' }}
              />
              <input
                placeholder="Ville (optionnel)"
                value={clientCity}
                onChange={(e) => setClientCity(e.target.value)}
                className="px-4 py-3 rounded-xl border outline-none text-sm"
                style={{ borderColor: '#BF984D55', backgroundColor: '#FAF3EE' }}
              />
            </div>
          )}
        </div>

        {/* ── Date ── */}
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: '#702434' }}>Date de la facture</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-4 rounded-xl border outline-none text-sm text-left"
            style={{
              borderColor: '#BF984D55',
              backgroundColor: '#FAF3EE',
              height: '48px',
              lineHeight: '48px',
            }}
          />
        </div>

        {/* ── Articles ── */}
        <div>
          <h2 className="font-semibold mb-4" style={{ color: '#702434' }}>Articles</h2>
          <div className="space-y-4">
            {items.map((item, i) => (
              <div key={i} className="p-4 rounded-xl border" style={{ borderColor: '#BF984D22', backgroundColor: '#FAF3EE55' }}>

                {/* Row 1: photo + note side by side */}
                <div className="flex gap-3 mb-3">
                  <label className="cursor-pointer flex-shrink-0">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => e.target.files?.[0] && handlePhoto(i, e.target.files[0])}
                    />
                    {item.preview ? (
                      <img src={item.preview} className="w-20 h-20 rounded-xl object-cover border" style={{ borderColor: '#BF984D55' }} alt="" />
                    ) : (
                      <div className="w-20 h-20 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-1" style={{ borderColor: '#BF984D55' }}>
                        <span className="text-xl">📷</span>
                        <span className="text-xs" style={{ color: '#BF984D' }}>Photo</span>
                      </div>
                    )}
                  </label>
                  <input
                    type="text"
                    placeholder="Note (ex: caftan brodé, taille M)"
                    value={item.note}
                    onChange={(e) => updateItem(i, 'note', e.target.value)}
                    className="flex-1 px-3 rounded-xl border outline-none text-sm"
                    style={{ borderColor: '#BF984D55', backgroundColor: 'white', height: '80px' }}
                  />
                </div>

                {/* Row 2: qty | price | total + remove */}
                <div className="grid grid-cols-3 gap-2 items-end">
                  <div>
                    <label className="block text-xs mb-1" style={{ color: '#999' }}>Quantité</label>
                    <input
                      type="number" min="1" value={item.quantity}
                      onChange={(e) => updateItem(i, 'quantity', Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border outline-none text-sm"
                      style={{ borderColor: '#BF984D55', backgroundColor: 'white' }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs mb-1" style={{ color: '#999' }}>Prix (DH)</label>
                    <input
                      type="number" min="0" value={item.unit_price}
                      onChange={(e) => updateItem(i, 'unit_price', Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border outline-none text-sm"
                      style={{ borderColor: '#BF984D55', backgroundColor: 'white' }}
                    />
                  </div>
                  <div className="flex items-end justify-between pb-0.5">
                    <div>
                      <p className="text-xs mb-1" style={{ color: '#999' }}>Total</p>
                      <p className="font-semibold text-sm" style={{ color: '#702434' }}>
                        {(item.quantity * item.unit_price).toLocaleString('fr-MA')} DH
                      </p>
                    </div>
                    {items.length > 1 && (
                      <button onClick={() => removeItem(i)} className="text-red-400 ml-1">✕</button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button onClick={addItem} className="mt-3 text-sm font-medium" style={{ color: '#BF984D' }}>
            + Ajouter un article
          </button>
        </div>

        {/* ── Total ── */}
        <div className="flex justify-end border-t pt-6" style={{ borderColor: '#BF984D22' }}>
          <div className="text-right">
            <p className="text-sm" style={{ color: '#999' }}>Total TTC</p>
            <p className="text-3xl font-bold" style={{ color: '#702434' }}>
              {total.toLocaleString('fr-MA')} DH
            </p>
          </div>
        </div>

        {/* ── Initial payments (CREATE mode only) ── */}
        {!isEditMode && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold" style={{ color: '#702434' }}>Paiements initiaux</h2>
              {!showPaymentSection && (
                <button
                  onClick={() => { setShowPaymentSection(true); addPayment() }}
                  className="text-sm font-medium"
                  style={{ color: '#BF984D' }}
                >
                  + Ajouter un paiement
                </button>
              )}
            </div>

            {showPaymentSection && (
              <div className="space-y-3">
                {initialPayments.map((payment, i) => (
                  <div key={i} className="p-4 rounded-xl border" style={{ borderColor: '#BF984D22', backgroundColor: '#FAF3EE55' }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs mb-1" style={{ color: '#999' }}>Montant (DH)</label>
                        <input type="number" min="0" value={payment.amount}
                          onChange={(e) => updatePayment(i, 'amount', Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-lg border outline-none text-sm"
                          style={{ borderColor: '#BF984D55', backgroundColor: 'white' }} />
                      </div>
                      <div>
                        <label className="block text-xs mb-1" style={{ color: '#999' }}>Date du paiement</label>
                        <input type="date" value={payment.date}
                          onChange={(e) => updatePayment(i, 'date', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border outline-none text-sm"
                          style={{ borderColor: '#BF984D55', backgroundColor: 'white' }} />
                      </div>
                      <div>
                        <label className="block text-xs mb-1" style={{ color: '#999' }}>Origine</label>
                        <select value={payment.origine}
                          onChange={(e) => updatePayment(i, 'origine', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border outline-none text-sm"
                          style={{ borderColor: '#BF984D55', backgroundColor: 'white' }}>
                          <option value="">Sélectionner...</option>
                          <option value="Espèces">Espèces</option>
                          <option value="Chèque">Chèque</option>
                          <option value="Virement">Virement</option>
                          <option value="Carte bancaire">Carte bancaire</option>
                          <option value="Autre">Autre</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs mb-1" style={{ color: '#999' }}>Note (optionnel)</label>
                        <input type="text" placeholder="Référence, détail..." value={payment.note}
                          onChange={(e) => updatePayment(i, 'note', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border outline-none text-sm"
                          style={{ borderColor: '#BF984D55', backgroundColor: 'white' }} />
                      </div>
                    </div>
                    <button onClick={() => removePayment(i)} className="mt-2 text-xs text-red-400 hover:text-red-600">
                      ✕ Supprimer ce paiement
                    </button>
                  </div>
                ))}
                <button onClick={addPayment} className="text-sm font-medium" style={{ color: '#BF984D' }}>
                  + Autre paiement
                </button>
                {initialPayments.some((p) => p.amount > 0) && (
                  <div className="p-4 rounded-xl" style={{ backgroundColor: '#FAF3EE' }}>
                    <p className="text-sm" style={{ color: '#999' }}>
                      Payé maintenant : <strong style={{ color: '#2d7a4f' }}>{totalInitiallyPaid.toLocaleString('fr-MA')} DH</strong>
                    </p>
                    <p className="text-sm mt-1" style={{ color: '#999' }}>
                      Reste à payer : <strong style={{ color: '#BF984D' }}>{Math.max(0, total - totalInitiallyPaid).toLocaleString('fr-MA')} DH</strong>
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Payments (EDIT mode only) ── */}
        {isEditMode && (
          <div>
            <h2 className="font-semibold mb-3" style={{ color: '#702434' }}>Paiements</h2>

            {/* Existing payments — read-only */}
            {existingPayments.length > 0 && (
              <div className="mb-4">
                <p className="text-xs font-medium mb-2" style={{ color: '#999' }}>Paiements enregistrés</p>
                <div className="space-y-2">
                  {existingPayments.map((p) => (
                    <div key={p.id} className="flex flex-wrap items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: '#FAF3EE55' }}>
                      <p className="text-sm" style={{ color: '#702434' }}>{new Date(p.date).toLocaleDateString('fr-MA')}</p>
                      <p className="text-sm font-semibold" style={{ color: '#2d7a4f' }}>+{Number(p.amount).toLocaleString('fr-MA')} DH</p>
                      <p className="text-sm" style={{ color: '#702434' }}>{p.origine || '—'}</p>
                      <p className="text-sm flex-1" style={{ color: '#999' }}>{p.note || ''}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {existingPayments.length === 0 && (
              <p className="text-sm mb-4" style={{ color: '#999' }}>Aucun paiement enregistré pour cette facture.</p>
            )}

            {/* Add new payment */}
            {!showNewPaymentForm && (
              <button
                onClick={() => { setShowNewPaymentForm(true); addNewPayment() }}
                className="text-sm font-medium"
                style={{ color: '#BF984D' }}
              >
                + Ajouter un nouveau paiement
              </button>
            )}

            {showNewPaymentForm && (
              <div className="space-y-3">
                {newPayments.map((payment, i) => (
                  <div key={i} className="p-4 rounded-xl border" style={{ borderColor: '#BF984D22', backgroundColor: '#FAF3EE55' }}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs mb-1" style={{ color: '#999' }}>Montant (DH)</label>
                        <input type="number" min="0" value={payment.amount}
                          onChange={(e) => updateNewPayment(i, 'amount', Number(e.target.value))}
                          className="w-full px-3 py-2 rounded-lg border outline-none text-sm"
                          style={{ borderColor: '#BF984D55', backgroundColor: 'white' }} />
                      </div>
                      <div>
                        <label className="block text-xs mb-1" style={{ color: '#999' }}>Date du paiement</label>
                        <input type="date" value={payment.date}
                          onChange={(e) => updateNewPayment(i, 'date', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border outline-none text-sm"
                          style={{ borderColor: '#BF984D55', backgroundColor: 'white' }} />
                      </div>
                      <div>
                        <label className="block text-xs mb-1" style={{ color: '#999' }}>Origine</label>
                        <select value={payment.origine}
                          onChange={(e) => updateNewPayment(i, 'origine', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border outline-none text-sm"
                          style={{ borderColor: '#BF984D55', backgroundColor: 'white' }}>
                          <option value="">Sélectionner...</option>
                          <option value="Espèces">Espèces</option>
                          <option value="Chèque">Chèque</option>
                          <option value="Virement">Virement</option>
                          <option value="Carte bancaire">Carte bancaire</option>
                          <option value="Autre">Autre</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs mb-1" style={{ color: '#999' }}>Note (optionnel)</label>
                        <input type="text" placeholder="Référence, détail..." value={payment.note}
                          onChange={(e) => updateNewPayment(i, 'note', e.target.value)}
                          className="w-full px-3 py-2 rounded-lg border outline-none text-sm"
                          style={{ borderColor: '#BF984D55', backgroundColor: 'white' }} />
                      </div>
                    </div>
                    <button onClick={() => removeNewPayment(i)} className="mt-2 text-xs text-red-400 hover:text-red-600">
                      ✕ Supprimer ce paiement
                    </button>
                  </div>
                ))}
                <button onClick={addNewPayment} className="text-sm font-medium" style={{ color: '#BF984D' }}>
                  + Autre nouveau paiement
                </button>
              </div>
            )}

            {/* Balance summary in edit mode */}
            {(existingPayments.length > 0 || newPayments.some((p) => p.amount > 0)) && (
              <div className="mt-4 p-4 rounded-xl space-y-1" style={{ backgroundColor: '#FAF3EE' }}>
                <p className="text-sm" style={{ color: '#999' }}>
                  Déjà payé : <strong style={{ color: '#2d7a4f' }}>{totalAlreadyPaid.toLocaleString('fr-MA')} DH</strong>
                </p>
                {totalNewPayments > 0 && (
                  <p className="text-sm" style={{ color: '#999' }}>
                    Nouveau paiement : <strong style={{ color: '#2d7a4f' }}>+{totalNewPayments.toLocaleString('fr-MA')} DH</strong>
                  </p>
                )}
                <p className="text-sm" style={{ color: '#999' }}>
                  Reste à payer : <strong style={{ color: remainingAfterEdit > 0 ? '#BF984D' : '#2d7a4f' }}>
                    {Math.max(0, remainingAfterEdit).toLocaleString('fr-MA')} DH
                  </strong>
                </p>
              </div>
            )}
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 rounded-xl text-white font-semibold text-sm transition"
          style={{ backgroundColor: saving ? '#BF984D' : '#702434' }}
        >
          {saving
            ? (isEditMode ? 'Enregistrement...' : 'Création...')
            : (isEditMode ? 'Enregistrer les modifications' : 'Enregistrer la facture')}
        </button>
      </div>
    </div>
  )
}