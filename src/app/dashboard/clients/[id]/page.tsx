'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

type ClientDetail = {
  id: string
  name: string
  phone?: string
  city?: string
  total_invoiced: number
  total_paid: number
  total_remaining: number
  invoices: {
    id: string
    number: string
    date: string
    status: string
    total: number
    total_paid: number
    remaining: number
  }[]
}

const statusColors: Record<string, { text: string; bg: string }> = {
  'En attente': { text: '#999', bg: '#f5f5f5' },
  'Partiel':    { text: '#BF984D', bg: '#BF984D22' },
  'Soldé':      { text: '#2d7a4f', bg: '#2d7a4f22' },
}

export default function ClientDetailPage() {
  const { id } = useParams()
  const router = useRouter()
  const [client, setClient] = useState<ClientDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/clients/${id}`)
      .then((r) => r.json())
      .then((data) => { setClient(data); setLoading(false) })
  }, [id])

  if (loading) return (
    <div className="flex items-center justify-center h-64" style={{ color: '#BF984D' }}>
      Chargement...
    </div>
  )

  if (!client) return (
    <div className="text-center py-16" style={{ color: '#702434' }}>Client introuvable</div>
  )

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button onClick={() => router.back()} style={{ color: '#BF984D' }}>← Retour</button>
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
            style={{ backgroundColor: '#702434' }}
          >
            {client.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold" style={{ color: '#702434', fontFamily: 'Playfair Display, serif' }}>
              {client.name}
            </h1>
            <p className="text-sm" style={{ color: '#999' }}>
              {[client.phone, client.city].filter(Boolean).join(' · ') || 'Aucune info supplémentaire'}
            </p>
          </div>
        </div>
      </div>

      {/* Balance summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {[
          { label: 'Total facturé', value: client.total_invoiced, color: '#702434' },
          { label: 'Total payé', value: client.total_paid, color: '#2d7a4f' },
          { label: 'Reste à payer', value: client.total_remaining, color: '#BF984D' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl border p-5" style={{ borderColor: '#BF984D22' }}>
            <p className="text-xs mb-1" style={{ color: '#999' }}>{stat.label}</p>
            <p className="text-xl font-bold" style={{ color: stat.color }}>
              {Number(stat.value).toLocaleString('fr-MA')} DH
            </p>
          </div>
        ))}
      </div>

      {/* Invoices list */}
      <div className="bg-white rounded-2xl border p-6" style={{ borderColor: '#BF984D22' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold" style={{ color: '#702434' }}>
            Factures ({client.invoices.length})
          </h2>
          <Link
            href="/dashboard/invoices/new"
            className="px-4 py-2 rounded-xl text-white text-sm font-semibold"
            style={{ backgroundColor: '#702434' }}
          >
            + Nouvelle facture
          </Link>
        </div>

        {client.invoices.length === 0 ? (
          <div className="text-center py-8" style={{ color: '#999' }}>
            <p className="text-3xl mb-2">📄</p>
            <p className="text-sm">Aucune facture pour ce client</p>
          </div>
        ) : (
          <div className="space-y-3">
            {client.invoices.map((inv) => {
              const s = statusColors[inv.status] || statusColors['En attente']
              return (
                <Link
                  key={inv.id}
                  href={`/dashboard/invoices/${inv.id}`}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl hover:bg-orange-50 transition gap-3"
                  style={{ backgroundColor: '#FAF3EE55' }}
                >
                  <div>
                    <p className="font-semibold text-sm" style={{ color: '#702434' }}>{inv.number}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#999' }}>
                      {new Date(inv.date).toLocaleDateString('fr-MA')}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-4">
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
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}