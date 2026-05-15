import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import Link from 'next/link'

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1
            className="text-2xl font-bold"
            style={{ color: '#702434', fontFamily: 'Playfair Display, serif' }}
          >
            Tableau de bord
          </h1>
          <p className="text-sm mt-1" style={{ color: '#BF984D' }}>
            Bienvenue, {session?.user?.name}
          </p>
        </div>
        <Link
          href="/dashboard/invoices/new"
          className="px-5 py-2.5 rounded-xl text-white text-sm font-semibold shadow-sm transition"
          style={{ backgroundColor: '#702434' }}
        >
          + Nouvelle facture
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-5 mb-8">
        {[
          { label: 'Total facturé', value: '0 DH', color: '#702434' },
          { label: 'Total encaissé', value: '0 DH', color: '#2d7a4f' },
          { label: 'Reste à payer', value: '0 DH', color: '#BF984D' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-2xl p-6 shadow-sm border"
            style={{ borderColor: '#BF984D22' }}
          >
            <p className="text-sm mb-1" style={{ color: '#999' }}>{stat.label}</p>
            <p className="text-2xl font-bold" style={{ color: stat.color }}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Recent invoices placeholder */}
      <div
        className="bg-white rounded-2xl shadow-sm border p-8 text-center"
        style={{ borderColor: '#BF984D22' }}
      >
        <p className="text-4xl mb-3">📄</p>
        <p className="font-semibold" style={{ color: '#702434' }}>Aucune facture pour le moment</p>
        <p className="text-sm mt-1 mb-5" style={{ color: '#999' }}>
          Créez votre première facture pour commencer
        </p>
        <Link
          href="/dashboard/invoices/new"
          className="inline-block px-5 py-2.5 rounded-xl text-white text-sm font-semibold"
          style={{ backgroundColor: '#702434' }}
        >
          + Nouvelle facture
        </Link>
      </div>
    </div>
  )
}