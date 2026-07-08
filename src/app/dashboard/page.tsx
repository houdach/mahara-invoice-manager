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
  clients: { name: string }
}

type Stats = {
  totalInvoiced: number
  totalCollected: number
  totalRemaining: number
  recentInvoices: Invoice[]
}

type FilterKey = 'week' | 'month' | 'quarter' | 'year' | 'all'

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'week', label: 'Cette semaine' },
  { key: 'month', label: 'Ce mois' },
  { key: 'quarter', label: '3 derniers mois' },
  { key: 'year', label: 'Cette année' },
  { key: 'all', label: 'Tout' },
]

function getDateRange(filter: FilterKey): { from: string | null; to: string | null } {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  const fmt = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

  if (filter === 'all') return { from: null, to: null }

  const to = fmt(now)

  if (filter === 'week') {
    const from = new Date(now)
    from.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1)) // Monday
    return { from: fmt(from), to }
  }

  if (filter === 'month') {
    const from = new Date(now.getFullYear(), now.getMonth(), 1)
    return { from: fmt(from), to }
  }

  if (filter === 'quarter') {
    const from = new Date(now)
    from.setMonth(now.getMonth() - 3)
    return { from: fmt(from), to }
  }

  if (filter === 'year') {
    const from = new Date(now.getFullYear(), 0, 1)
    return { from: fmt(from), to }
  }

  return { from: null, to: null }
}

const statusColors: Record<string, { text: string; bg: string }> = {
  'En attente': { text: '#999', bg: '#f5f5f5' },
  'Partiel': { text: '#BF984D', bg: '#BF984D22' },
  'Soldé': { text: '#2d7a4f', bg: '#2d7a4f22' },
}

export default function DashboardPage() {
  const [filter, setFilter] = useState<FilterKey>('month')
  const [stats, setStats] = useState<Stats>({
    totalInvoiced: 0,
    totalCollected: 0,
    totalRemaining: 0,
    recentInvoices: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStats()
  }, [filter])

  async function fetchStats() {
    setLoading(true)
    const { from, to } = getDateRange(filter)
    const params = new URLSearchParams()
    if (from) params.set('from', from)
    if (to) params.set('to', to)

    const res = await fetch(`/api/invoices?${params.toString()}`)
    const invoices: any[] = await res.json()

    let totalInvoiced = 0
    let totalCollected = 0

    invoices.forEach((inv) => {
      totalInvoiced += Number(inv.total)
      totalCollected += Number(inv.total_paid || 0)
    })

    setStats({
      totalInvoiced,
      totalCollected,
      totalRemaining: totalInvoiced - totalCollected,
      recentInvoices: invoices.slice(0, 5),
    })
    setLoading(false)
  }

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#702434', fontFamily: 'Playfair Display, serif' }}>
            Tableau de bord
          </h1>
        </div>
        <Link
          href="/dashboard/invoices/new"
          className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold shadow-sm text-center"
          style={{ backgroundColor: '#702434' }}
        >
          + Nouvelle facture
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className="px-4 py-2 rounded-xl text-sm font-medium transition"
            style={{
              backgroundColor: filter === f.key ? '#702434' : 'white',
              color: filter === f.key ? 'white' : '#702434',
              border: '1px solid #BF984D33',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        {[
          { label: 'Total facturé', value: stats.totalInvoiced, color: '#702434' },
          { label: 'Total encaissé', value: stats.totalCollected, color: '#2d7a4f' },
          { label: 'Reste à payer', value: stats.totalRemaining, color: '#BF984D' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl p-6 shadow-sm border" style={{ borderColor: '#BF984D22' }}>
            <p className="text-sm mb-1" style={{ color: '#999' }}>{stat.label}</p>
            {loading ? (
              <div className="h-8 rounded animate-pulse" style={{ backgroundColor: '#f0e8e0', width: '60%' }} />
            ) : (
              <p className="text-2xl font-bold" style={{ color: stat.color }}>
                {stat.value.toLocaleString('fr-MA')} DH
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Recent invoices */}
      <div className="bg-white rounded-2xl shadow-sm border p-6" style={{ borderColor: '#BF984D22' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold" style={{ color: '#702434' }}>Factures récentes</h2>
          <Link href="/dashboard/invoices" className="text-sm" style={{ color: '#BF984D' }}>
            Voir tout →
          </Link>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-xl animate-pulse" style={{ backgroundColor: '#f5f0eb' }} />
            ))}
          </div>
        ) : stats.recentInvoices.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-3xl mb-2">📄</p>
            <p className="text-sm" style={{ color: '#999' }}>
              Aucune facture sur cette période
            </p>
            <Link
              href="/dashboard/invoices/new"
              className="inline-block mt-4 px-5 py-2.5 rounded-xl text-white text-sm font-semibold"
              style={{ backgroundColor: '#702434' }}
            >
              + Nouvelle facture
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {stats.recentInvoices.map((inv) => {
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
                    <p className="text-xs mt-0.5" style={{ color: '#999' }}>{inv.clients?.name}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <p className="text-sm font-semibold" style={{ color: '#702434' }}>
                      {Number(inv.total).toLocaleString('fr-MA')} DH
                    </p>
                    <span className="px-3 py-1 rounded-full text-xs font-semibold"
                      style={{ color: s.text, backgroundColor: s.bg }}>
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
    </div>
  )
}