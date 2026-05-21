'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'

type Client = { id: string; name: string; city?: string; phone?: string }
type Item = { photo_base64: string | null; quantity: number; unit_price: number; preview: string | null }

function today() { return new Date().toISOString().split('T')[0] }
function inFifteenDays() {
  const d = new Date(); d.setDate(d.getDate() + 15)
  return d.toISOString().split('T')[0]
}

export default function NewInvoicePage() {
  const router = useRouter()

  // Client
  const [clientName, setClientName] = useState('')
  const [clientId, setClientId] = useState<string | null>(null)
  const [clientPhone, setClientPhone] = useState('')
  const [clientCity, setClientCity] = useState('')
  const [suggestions, setSuggestions] = useState<Client[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isNewClient, setIsNewClient] = useState(false)

  // Invoice
  const [date, setDate] = useState(today())
  const [validity, setValidity] = useState(inFifteenDays())
  const [items, setItems] = useState<Item[]>([
    { photo_base64: null, quantity: 1, unit_price: 0, preview: null }
  ])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  // Autocomplete
  useEffect(() => {
    if (clientName.length < 1) { setSuggestions([]); return }
    const timeout = setTimeout(async () => {
      const res = await fetch(`/api/clients/search?q=${encodeURIComponent(clientName)}`)
      const data = await res.json()
      setSuggestions(data)
      setShowSuggestions(true)
    }, 300)
    return () => clearTimeout(timeout)
  }, [clientName])

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

  // Items
  function addItem() {
    setItems([...items, { photo_base64: null, quantity: 1, unit_price: 0, preview: null }])
  }

  function removeItem(i: number) {
    setItems(items.filter((_, idx) => idx !== i))
  }

  function updateItem(i: number, field: keyof Item, value: any) {
    setItems(items.map((item, idx) => idx === i ? { ...item, [field]: value } : item))
  }

  function handlePhoto(i: number, file: File) {
    const reader = new FileReader()
    reader.onload = (e) => {
      const base64 = e.target?.result as string
      updateItem(i, 'photo_base64', base64)
      updateItem(i, 'preview', base64)
    }
    reader.readAsDataURL(file)
  }

  const total = items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)

  async function handleSave() {
    if (!clientName) { setError('Veuillez entrer un nom de client'); return }
    if (items.some(i => i.unit_price === 0)) { setError('Veuillez entrer un prix pour chaque article'); return }
    setSaving(true)
    setError('')

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

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} style={{ color: '#BF984D' }}>← Retour</button>
        <h1 className="text-2xl font-bold" style={{ color: '#702434', fontFamily: 'Playfair Display, serif' }}>
          Nouvelle facture
        </h1>
      </div>

      <div className="bg-white rounded-2xl border p-8 space-y-8" style={{ borderColor: '#BF984D22' }}>

        {/* Client */}
        <div>
          <h2 className="font-semibold mb-4" style={{ color: '#702434' }}>Client</h2>
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
            {/* Suggestions dropdown */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 bg-white border rounded-xl shadow-lg z-10 mt-1 overflow-hidden" style={{ borderColor: '#BF984D33' }}>
                {suggestions.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => selectClient(c)}
                    className="w-full text-left px-4 py-3 hover:bg-orange-50 transition flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: '#702434' }}>
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

          {/* New client extra fields */}
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

        {/* Dates */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#702434' }}>Date</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border outline-none"
              style={{ borderColor: '#BF984D55', backgroundColor: '#FAF3EE' }} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: '#702434' }}>Validité</label>
            <input type="date" value={validity} onChange={(e) => setValidity(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border outline-none"
              style={{ borderColor: '#BF984D55', backgroundColor: '#FAF3EE' }} />
          </div>
        </div>

        {/* Items */}
        <div>
          <h2 className="font-semibold mb-4" style={{ color: '#702434' }}>Articles</h2>
          <div className="space-y-4">
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-xl border" style={{ borderColor: '#BF984D22', backgroundColor: '#FAF3EE55' }}>

                {/* Photo upload */}
                <label className="cursor-pointer flex-shrink-0">
                  <input type="file" accept="image/*" className="hidden"
                    onChange={(e) => e.target.files?.[0] && handlePhoto(i, e.target.files[0])} />
                  {item.preview ? (
                    <img src={item.preview} className="w-16 h-16 rounded-xl object-cover border" style={{ borderColor: '#BF984D55' }} />
                  ) : (
                    <div className="w-16 h-16 rounded-xl border-2 border-dashed flex items-center justify-center text-2xl"
                      style={{ borderColor: '#BF984D55' }}>📷</div>
                  )}
                </label>

                {/* Quantity */}
                <div className="flex-shrink-0 w-24">
                  <label className="block text-xs mb-1" style={{ color: '#999' }}>Quantité</label>
                  <input type="number" min="1" value={item.quantity}
                    onChange={(e) => updateItem(i, 'quantity', Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border outline-none text-sm"
                    style={{ borderColor: '#BF984D55' }} />
                </div>

                {/* Unit price */}
                <div className="flex-1">
                  <label className="block text-xs mb-1" style={{ color: '#999' }}>Prix unitaire (DH)</label>
                  <input type="number" min="0" value={item.unit_price}
                    onChange={(e) => updateItem(i, 'unit_price', Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border outline-none text-sm"
                    style={{ borderColor: '#BF984D55' }} />
                </div>

                {/* Line total */}
                <div className="flex-shrink-0 text-right">
                  <p className="text-xs mb-1" style={{ color: '#999' }}>Total</p>
                  <p className="font-semibold text-sm" style={{ color: '#702434' }}>
                    {(item.quantity * item.unit_price).toLocaleString('fr-MA')} DH
                  </p>
                </div>

                {/* Remove */}
                {items.length > 1 && (
                  <button onClick={() => removeItem(i)} className="text-red-400 hover:text-red-600 flex-shrink-0">✕</button>
                )}
              </div>
            ))}
          </div>

          <button onClick={addItem} className="mt-3 text-sm font-medium" style={{ color: '#BF984D' }}>
            + Ajouter un article
          </button>
        </div>

        {/* Total */}
        <div className="flex justify-end border-t pt-6" style={{ borderColor: '#BF984D22' }}>
          <div className="text-right">
            <p className="text-sm" style={{ color: '#999' }}>Total TTC</p>
            <p className="text-3xl font-bold" style={{ color: '#702434' }}>
              {total.toLocaleString('fr-MA')} DH
            </p>
          </div>
        </div>

        {/* Error */}
        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-4 rounded-xl text-white font-semibold text-sm"
          style={{ backgroundColor: saving ? '#BF984D' : '#702434' }}
        >
          {saving ? 'Enregistrement...' : 'Enregistrer la facture'}
        </button>
      </div>
    </div>
  )
}