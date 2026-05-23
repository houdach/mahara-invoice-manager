import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseAdmin } from '@/lib/supabase'
import Link from 'next/link'

async function getStats() {
  const { data: invoices } = await supabaseAdmin
    .from('invoices')
    .select(`total, payments ( amount )`)

  if (!invoices) return { totalInvoiced: 0, totalCollected: 0, totalRemaining: 0, recentInvoices: [] }

  let totalInvoiced = 0
  let totalCollected = 0

  invoices.forEach((inv: any) => {
    totalInvoiced += Number(inv.total)
    const paid = inv.payments?.reduce((s: number, p: any) => s + Number(p.amount), 0) || 0
    totalCollected += paid
  })

  // Recent invoices with client name
  const { data: recent } = await supabaseAdmin
    .from('invoices')
    .select(`id, number, date, status, total, clients ( name ), payments ( amount )`)
    .order('created_at', { ascending: false })
    .limit(5)

  const recentInvoices = (recent || []).map((inv: any) => {
    const paid = inv.payments?.reduce((s: number, p: any) => s + Number(p.amount), 0) || 0
    return { ...inv, total_paid: paid, remaining: Number(inv.total) - paid }
  })

  return {
    totalInvoiced,
    totalCollected,
    totalRemaining: totalInvoiced - totalCollected,
    recentInvoices,
  }
}

const statusColors: Record<string, { text: string; bg: string }> = {
  'En attente': { text: '#999', bg: '#f5f5f5' },
  'Partiel':    { text: '#BF984D', bg: '#BF984D22' },
  'Soldé':      { text: '#2d7a4f', bg: '#2d7a4f22' },
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  const { totalInvoiced, totalCollected, totalRemaining, recentInvoices } = await getStats()

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: '#702434', fontFamily: 'Playfair Display, serif' }}>
            Tableau de bord
          </h1>
          <p className="text-sm mt-1" style={{ color: '#BF984D' }}>
            Bienvenue{session?.user?.name ? `, ${session.user.name}` : ''}
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

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        {[
          { label: 'Total facturé', value: totalInvoiced, color: '#702434' },
          { label: 'Total encaissé', value: totalCollected, color: '#2d7a4f' },
          { label: 'Reste à payer', value: totalRemaining, color: '#BF984D' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white rounded-2xl p-6 shadow-sm border" style={{ borderColor: '#BF984D22' }}>
            <p className="text-sm mb-1" style={{ color: '#999' }}>{stat.label}</p>
            <p className="text-2xl font-bold" style={{ color: stat.color }}>
              {stat.value.toLocaleString('fr-MA')} DH
            </p>
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

        {recentInvoices.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-3xl mb-2">📄</p>
            <p className="text-sm" style={{ color: '#999' }}>Aucune facture pour le moment</p>
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
            {recentInvoices.map((inv: any) => {
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
    </div>
  )
}