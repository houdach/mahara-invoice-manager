'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

// --- Type definitions ---
// These describe the shape of our data so TypeScript can catch mistakes early.
// If you try to set item.quantity to a string, TypeScript will warn you.
type Client = { id: string; name: string; city?: string; phone?: string }
type Item = { photo_base64: string | null; quantity: number; unit_price: number; preview: string | null }
type Payment = { amount: number; date: string; note: string }

// Helper functions to get today's date and the date 15 days from now
// in YYYY-MM-DD format, which is what HTML date inputs expect.
function today() {
  return new Date().toISOString().split('T')[0]
}
function inFifteenDays() {
  const d = new Date()
  d.setDate(d.getDate() + 15)
  return d.toISOString().split('T')[0]
}

export default function NewInvoicePage() {
  const router = useRouter()

  // --- Client state ---
  // We track both the typed name and the resolved ID separately.
  // clientId is null when the owner is typing a new name that doesn't exist yet.
  // Once they pick from the dropdown, clientId gets set to the existing client's UUID.
  const [clientName, setClientName] = useState('')
  const [clientId, setClientId] = useState<string | null>(null)
  const [clientPhone, setClientPhone] = useState('')
  const [clientCity, setClientCity] = useState('')
  const [suggestions, setSuggestions] = useState<Client[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isNewClient, setIsNewClient] = useState(false)

  // --- Invoice state ---
  const [date, setDate] = useState(today())
  const [validity, setValidity] = useState(inFifteenDays())

  // We start with one empty item row so the form never looks blank
  const [items, setItems] = useState<Item[]>([
    { photo_base64: null, quantity: 1, unit_price: 0, preview: null }
  ])

  // --- Initial payments state ---
  // Hidden by default. The owner clicks a button to reveal this section
  // only when a deposit was collected at the time of the command.
  const [initialPayments, setInitialPayments] = useState<Payment[]>([])
  const [showPaymentSection, setShowPaymentSection] = useState(false)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // --- Autocomplete with debounce ---
  // useEffect watches clientName. Every time it changes, we wait 300ms before
  // calling the API. If the user types again within 300ms, we cancel the previous
  // call with clearTimeout and start fresh. This is called "debouncing" —
  // it prevents us from making an API call on every single keystroke.
  useEffect(() => {
    if (clientName.length < 1) {
      setSuggestions([])
      return
    }
    const timeout = setTimeout(async () => {
      const res = await fetch(`/api/clients/search?q=${encodeURIComponent(clientName)}`)
      const data = await res.json()
      setSuggestions(data)
      setShowSuggestions(true)
    }, 300)
    // This cleanup function runs before the next effect fires.
    // It cancels the pending timeout so we never send stale requests.
    return () => clearTimeout(timeout)
  }, [clientName])

  // Called when the owner picks an existing client from the dropdown.
  // We fill in all known fields and mark isNewClient as false.
  function selectClient(client: Client) {
    setClientName(client.name)
    setClientId(client.id)
    setClientPhone(client.phone || '')
    setClientCity(client.city || '')
    setIsNewClient(false)
    setShowSuggestions(false)
    setSuggestions([])
  }

  // Called when the owner types freely — we clear the resolved ID
  // because the name might no longer match any existing client.
  function handleClientType(val: string) {
    setClientName(val)
    setClientId(null)
    setIsNewClient(true)
  }

  // --- Item helpers ---
  // These follow the "immutable update" pattern: instead of mutating the array
  // directly, we create a new array and React re-renders only what changed.
  function addItem() {
    setItems([...items, { photo_base64: null, quantity: 1, unit_price: 0, preview: null }])
  }

  function removeItem(i: number) {
    setItems(items.filter((_, idx) => idx !== i))
  }

  function updateItem(i: number, field: keyof Item, value: any) {
    setItems(items.map((item, idx) => (idx === i ? { ...item, [field]: value } : item)))
  }

  // FileReader is a browser API that reads a file and converts it to base64.
  // We store both the base64 (for saving to DB) and a preview URL (for display).
  // In this case they're the same thing since readAsDataURL returns a data: URI.
  function handlePhoto(i: number, file: File) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const base64 = e.target?.result as string
      // Update both fields in one single state update to avoid overwriting
      setItems(prev => prev.map((item, idx) =>
        idx === i ? { ...item, photo_base64: base64, preview: base64 } : item
      ))
    }
    reader.readAsDataURL(file)
  }

  // --- Payment helpers ---
  function addPayment() {
    setInitialPayments([...initialPayments, { amount: 0, date: today(), note: '' }])
  }

  function updatePayment(i: number, field: keyof Payment, value: any) {
    setInitialPayments(initialPayments.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)))
  }

  function removePayment(i: number) {
    setInitialPayments(initialPayments.filter((_, idx) => idx !== i))
  }

  // The total is always derived from the current items state.
  // We never store it separately — we just compute it fresh on every render.
  const total = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)
  const totalInitiallyPaid = initialPayments.reduce((sum, p) => sum + Number(p.amount), 0)

  // --- Save handler ---
  async function handleSave() {
    if (!clientName) { setError('Veuillez entrer un nom de client'); return }
    if (items.some((i) => i.unit_price === 0)) { setError('Veuillez entrer un prix pour chaque article'); return }
    if (totalInitiallyPaid > total) { setError('Le total des paiements dépasse le montant de la facture'); return }

    setSaving(true)
    setError('')

    const res = await fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientName,
        clientId,
        // We only send phone/city if this is a new client being created.
        // For existing clients, that data is already in the DB.
        clientPhone: isNewClient ? clientPhone : undefined,
        clientCity: isNewClient ? clientCity : undefined,
        date,
        validity,
        items,
        // Send the initial payments array — the API handles it in Step 6.
        // If empty, the API skips that step entirely.
        initialPayments: initialPayments.filter((p) => p.amount > 0),
      }),
    })

    if (res.ok) {
      const invoice = await res.json()
      // Navigate to the invoice detail page on success
      router.push(`/dashboard/invoices/${invoice.id}`)
    } else {
      const data = await res.json()
      setError(data.error || 'Erreur lors de la création')
      setSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} style={{ color: '#BF984D' }}>
          ← Retour
        </button>
        <h1
          className="text-2xl font-bold"
          style={{ color: '#702434', fontFamily: 'Playfair Display, serif' }}
        >
          Nouvelle facture
        </h1>
      </div>

      <div
        className="bg-white rounded-2xl border p-8 space-y-8"
        style={{ borderColor: '#BF984D22' }}
      >
        {/* ── Section 1: Client ── */}
        <div>
          <h2 className="font-semibold mb-4" style={{ color: '#702434' }}>
            Client
          </h2>
          <div className="relative">
            <input
              type="text"
              placeholder="Nom du client..."
              value={clientName}
              onChange={(e) => handleClientType(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              className="w-full px-4 py-3 rounded-xl border outline-none"
              style={{ borderColor: '#BF984D55', backgroundColor: '#FAF3EE' }}
            />

            {/* Autocomplete dropdown — only visible when there are suggestions */}
            {showSuggestions && suggestions.length > 0 && (
              <div
                className="absolute top-full left-0 right-0 bg-white border rounded-xl shadow-lg z-10 mt-1 overflow-hidden"
                style={{ borderColor: '#BF984D33' }}
              >
                {suggestions.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => selectClient(c)}
                    className="w-full text-left px-4 py-3 hover:bg-orange-50 transition flex items-center gap-3"
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: '#702434' }}
                    >
                      {c.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-sm" style={{ color: '#702434' }}>
                        {c.name}
                      </p>
                      {c.city && (
                        <p className="text-xs" style={{ color: '#999' }}>
                          {c.city}
                        </p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Extra fields for new clients — only shown when no match found */}
          {isNewClient && clientName.length > 1 && suggestions.length === 0 && (
            <div className="mt-3 grid grid-cols-2 gap-3">
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

        {/* ── Section 2: Dates ── */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#702434' }}>
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border outline-none"
              style={{ borderColor: '#BF984D55', backgroundColor: '#FAF3EE' }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#702434' }}>
              Validité
            </label>
            <input
              type="date"
              value={validity}
              onChange={(e) => setValidity(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border outline-none"
              style={{ borderColor: '#BF984D55', backgroundColor: '#FAF3EE' }}
            />
          </div>
        </div>

        {/* ── Section 3: Line items ── */}
        <div>
          <h2 className="font-semibold mb-4" style={{ color: '#702434' }}>
            Articles
          </h2>
          <div className="space-y-4">
            {items.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-4 p-4 rounded-xl border"
                style={{ borderColor: '#BF984D22', backgroundColor: '#FAF3EE55' }}
              >
                {/* Photo upload — clicking the label triggers the hidden file input */}
                <label className="cursor-pointer flex-shrink-0">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handlePhoto(i, e.target.files[0])}
                  />
                  {item.preview ? (
                    <img
                      src={item.preview}
                      className="w-16 h-16 rounded-xl object-cover border"
                      style={{ borderColor: '#BF984D55' }}
                    />
                  ) : (
                    <div
                      className="w-16 h-16 rounded-xl border-2 border-dashed flex items-center justify-center text-2xl"
                      style={{ borderColor: '#BF984D55' }}
                    >
                      📷
                    </div>
                  )}
                </label>

                {/* Quantity */}
                <div className="flex-shrink-0 w-24">
                  <label className="block text-xs mb-1" style={{ color: '#999' }}>
                    Quantité
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => updateItem(i, 'quantity', Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border outline-none text-sm"
                    style={{ borderColor: '#BF984D55' }}
                  />
                </div>

                {/* Unit price */}
                <div className="flex-1">
                  <label className="block text-xs mb-1" style={{ color: '#999' }}>
                    Prix unitaire (DH)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={item.unit_price}
                    onChange={(e) => updateItem(i, 'unit_price', Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border outline-none text-sm"
                    style={{ borderColor: '#BF984D55' }}
                  />
                </div>

                {/* Line total — derived, never stored */}
                <div className="flex-shrink-0 text-right">
                  <p className="text-xs mb-1" style={{ color: '#999' }}>
                    Total
                  </p>
                  <p className="font-semibold text-sm" style={{ color: '#702434' }}>
                    {(item.quantity * item.unit_price).toLocaleString('fr-MA')} DH
                  </p>
                </div>

                {/* Remove button — hidden when there's only one item left */}
                {items.length > 1 && (
                  <button
                    onClick={() => removeItem(i)}
                    className="text-red-400 hover:text-red-600 flex-shrink-0"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={addItem}
            className="mt-3 text-sm font-medium"
            style={{ color: '#BF984D' }}
          >
            + Ajouter un article
          </button>
        </div>

        {/* ── Section 4: Invoice total ── */}
        <div
          className="flex justify-end border-t pt-6"
          style={{ borderColor: '#BF984D22' }}
        >
          <div className="text-right">
            <p className="text-sm" style={{ color: '#999' }}>
              Total TTC
            </p>
            <p className="text-3xl font-bold" style={{ color: '#702434' }}>
              {total.toLocaleString('fr-MA')} DH
            </p>
          </div>
        </div>

        {/* ── Section 5: Initial payments ── */}
        {/* This section is hidden by default. The owner only sees it if a deposit
            was already collected. Keeping it hidden avoids overwhelming the form
            for the common case where no payment is taken upfront. */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold" style={{ color: '#702434' }}>
              Paiements initiaux
            </h2>
            {!showPaymentSection && (
              <button
                onClick={() => {
                  setShowPaymentSection(true)
                  // Add the first row immediately so the owner doesn't have to click twice
                  addPayment()
                }}
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
                <div
                  key={i}
                  className="flex items-center gap-3 p-4 rounded-xl border"
                  style={{ borderColor: '#BF984D22', backgroundColor: '#FAF3EE55' }}
                >
                  {/* Amount */}
                  <div className="flex-1">
                    <label className="block text-xs mb-1" style={{ color: '#999' }}>
                      Montant (DH)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={payment.amount}
                      onChange={(e) => updatePayment(i, 'amount', Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border outline-none text-sm"
                      style={{ borderColor: '#BF984D55' }}
                    />
                  </div>

                  {/* Date */}
                  <div className="flex-1">
                    <label className="block text-xs mb-1" style={{ color: '#999' }}>
                      Date
                    </label>
                    <input
                      type="date"
                      value={payment.date}
                      onChange={(e) => updatePayment(i, 'date', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border outline-none text-sm"
                      style={{ borderColor: '#BF984D55' }}
                    />
                  </div>

                  {/* Note */}
                  <div className="flex-1">
                    <label className="block text-xs mb-1" style={{ color: '#999' }}>
                      Note
                    </label>
                    <input
                      type="text"
                      placeholder="Espèces, virement..."
                      value={payment.note}
                      onChange={(e) => updatePayment(i, 'note', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border outline-none text-sm"
                      style={{ borderColor: '#BF984D55' }}
                    />
                  </div>

                  <button
                    onClick={() => removePayment(i)}
                    className="text-red-400 hover:text-red-600 flex-shrink-0 mt-4"
                  >
                    ✕
                  </button>
                </div>
              ))}

              <button
                onClick={addPayment}
                className="text-sm font-medium"
                style={{ color: '#BF984D' }}
              >
                + Autre paiement
              </button>

              {/* Running summary — lets the owner visually confirm the balance at a glance */}
              {initialPayments.some((p) => p.amount > 0) && (
                <div
                  className="p-4 rounded-xl flex justify-between items-center"
                  style={{ backgroundColor: '#FAF3EE' }}
                >
                  <div className="space-y-1">
                    <p className="text-sm" style={{ color: '#999' }}>
                      Payé maintenant :{' '}
                      <strong style={{ color: '#2d7a4f' }}>
                        {totalInitiallyPaid.toLocaleString('fr-MA')} DH
                      </strong>
                    </p>
                    <p className="text-sm" style={{ color: '#999' }}>
                      Reste à payer :{' '}
                      <strong style={{ color: '#BF984D' }}>
                        {Math.max(0, total - totalInitiallyPaid).toLocaleString('fr-MA')} DH
                      </strong>
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Error message */}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 rounded-xl text-white font-semibold text-sm transition"
          style={{ backgroundColor: saving ? '#BF984D' : '#702434' }}
        >
          {saving ? 'Enregistrement...' : 'Enregistrer la facture'}
        </button>
      </div>
    </div>
  )
}