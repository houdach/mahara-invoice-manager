'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

type Client = {
  id: string
  name: string
  phone?: string
  city?: string
  created_at: string
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/clients')
      .then((r) => r.json())
      .then((data) => {
        console.log('clients data:', data)
        // API might return an error object instead of an array
        if (Array.isArray(data)) {
          setClients(data)
        } else {
          console.error('unexpected response:', data)
          setClients([])
        }
        setLoading(false)
      })
      .catch((err) => {
        console.error('fetch error:', err)
        setLoading(false)
      })
  }, [])

  const filtered = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.city?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold" style={{ color: '#702434', fontFamily: 'Playfair Display, serif' }}>
          Clients
        </h1>
        <p className="text-sm mt-1" style={{ color: '#BF984D' }}>
          {clients.length} client{clients.length !== 1 ? 's' : ''} enregistré{clients.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="mb-5">
        <input
          type="text"
          placeholder="Rechercher par nom ou ville..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border outline-none"
          style={{ borderColor: '#BF984D55', backgroundColor: 'white' }}
        />
      </div>

      {loading ? (
        <div className="text-center py-16" style={{ color: '#BF984D' }}>Chargement...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border p-12 text-center" style={{ borderColor: '#BF984D22' }}>
          <p className="text-4xl mb-3">👥</p>
          <p className="font-semibold" style={{ color: '#702434' }}>
            {search ? 'Aucun résultat' : 'Aucun client pour le moment'}
          </p>
          <p className="text-sm mt-1" style={{ color: '#999' }}>
            {search ? 'Essayez un autre nom' : 'Les clients apparaissent automatiquement lors de la création de factures'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((client) => (
            <Link
              key={client.id}
              href={`/dashboard/clients/${client.id}`}
              className="flex items-center justify-between bg-white rounded-2xl border p-5 hover:shadow-sm transition-all group"
              style={{ borderColor: '#BF984D22' }}
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                  style={{ backgroundColor: '#702434' }}
                >
                  {client.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold" style={{ color: '#702434' }}>{client.name}</p>
                  <p className="text-sm" style={{ color: '#999' }}>
                    {[client.phone, client.city].filter(Boolean).join(' · ') || 'Aucune info supplémentaire'}
                  </p>
                </div>
              </div>
              <span className="opacity-0 group-hover:opacity-100 transition-opacity text-sm" style={{ color: '#BF984D' }}>
                Voir →
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}