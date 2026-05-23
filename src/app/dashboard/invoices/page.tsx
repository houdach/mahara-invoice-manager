'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type Invoice = {
  id: string
  number: string
  date: string
  status: string
  total: number
  total_paid: number
  remaining: number
  clients: { name: string; city?: string }
}

const statusColors: Record<string, { text: string; bg: string }> = {
  'En attente': { text: '#999', bg: '#f5f5f5' },
  'Partiel':    { text: '#BF984D', bg: '#BF984D22' },
  'Soldé':      { text: '#2d7a4f', bg: '#2d7a4f22' },
}

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('Tous')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/invoices')
      .then((r) => r.json())
      .then((data) => { setInvoices(data); setLoading(false) })
  }, [])

  const filtered = invoices.filter((inv) => {
    const matchesSearch =
      inv.number.toLowerCase().includes(search.toLowerCase()) ||
      inv.clients?.name.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'Tous' || inv.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#702434', fontFamily: 'Playfair Display, serif' }}>
            Factures
          </h1>
          <p className="text-sm mt-1" style={{ color: '#BF984D' }}>
            {invoices.length} facture{invoices.length !== 1 ? 's' : ''}
          </p>
        </div>
        <Link
          href="/dashboard/invoices/new"
          className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold shadow-sm text-center"
          style={{ backgroundColor: '#702434' }}
        >
          + Nouvelle facture
        </Link>
      </div>

      {/* Search + filter */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <input
          type="text"
          placeholder="Rechercher par numéro ou client..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-4 py-3 rounded-xl border outline-none"
          style={{ borderColor: '#BF984D55', backgroundColor: 'white' }}
        />
        <div className="flex gap-2">
          {['Tous', 'En attente', 'Partiel', 'Soldé'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className="px-4 py-2 rounded-xl text-sm font-medium transition whitespace-nowrap"
              style={{
                backgroundColor: statusFilter === s ? '#702434' : 'white',
                color: statusFilter === s ? 'white' : '#702434',
                border: '1px solid #BF984D33',
              }}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-16" style={{ color: '#BF984D' }}>Chargement...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border p-12 text-center" style={{ borderColor: '#BF984D22' }}>
          <p className="text-4xl mb-3">📄</p>
          <p className="font-semibold" style={{ color: '#702434' }}>
            {search || statusFilter !== 'Tous' ? 'Aucun résultat' : 'Aucune facture pour le moment'}
          </p>
          <p className="text-sm mt-1 mb-5" style={{ color: '#999' }}>
            {search || statusFilter !== 'Tous' ? 'Essayez un autre filtre' : 'Créez votre première facture'}
          </p>
          {!search && statusFilter === 'Tous' && (
            <Link
              href="/dashboard/invoices/new"
              className="inline-block px-5 py-2.5 rounded-xl text-white text-sm font-semibold"
              style={{ backgroundColor: '#702434' }}
            >
              + Nouvelle facture
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((inv) => {
            const s = statusColors[inv.status] || statusColors['En attente']
            return (
              <Link
                key={inv.id}
                href={`/dashboard/invoices/${inv.id}`}
                className="flex flex-col sm:flex-row sm:items-center justify-between bg-white rounded-2xl border p-5 hover:shadow-sm transition-all gap-4"
                style={{ borderColor: '#BF984D22' }}
              >
                {/* Left — invoice number + client */}
                <div className="flex items-center gap-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: '#702434' }}
                  >
                    📄
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: '#702434' }}>
                      {inv.number}
                    </p>
                    <p className="text-sm" style={{ color: '#999' }}>
                      {inv.clients?.name}
                      {inv.clients?.city ? ` · ${inv.clients.city}` : ''}
                    </p>
                  </div>
                </div>

                {/* Right — amounts + status + date */}
                <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                  <div className="text-right">
                    <p className="text-xs" style={{ color: '#999' }}>Total</p>
                    <p className="font-semibold text-sm" style={{ color: '#702434' }}>
                      {Number(inv.total).toLocaleString('fr-MA')} DH
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs" style={{ color: '#999' }}>Payé</p>
                    <p className="font-semibold text-sm" style={{ color: '#2d7a4f' }}>
                      {Number(inv.total_paid).toLocaleString('fr-MA')} DH
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs" style={{ color: '#999' }}>Reste</p>
                    <p className="font-semibold text-sm" style={{ color: '#BF984D' }}>
                      {Number(inv.remaining).toLocaleString('fr-MA')} DH
                    </p>
                  </div>
                  <span
                    className="px-3 py-1 rounded-full text-xs font-semibold"
                    style={{ color: s.text, backgroundColor: s.bg }}
                  >
                    {inv.status}
                  </span>
                  <p className="text-xs" style={{ color: '#999' }}>
                    {new Date(inv.date).toLocaleDateString('fr-MA')}
                  </p>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}