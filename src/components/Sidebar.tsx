'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'

const navItems = [
  { href: '/dashboard', label: 'Tableau de bord', icon: '▦' },
  { href: '/dashboard/clients', label: 'Clients', icon: '👥' },
  { href: '/dashboard/invoices', label: 'Factures', icon: '📄' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside
      className="fixed left-0 top-0 h-full w-64 flex flex-col shadow-sm"
      style={{ backgroundColor: '#702434' }}
    >
      {/* Logo */}
      <div className="p-6 border-b" style={{ borderColor: '#ffffff22' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full border-2 flex items-center justify-center"
            style={{ borderColor: '#BF984D' }}
          >
            <span style={{ color: '#BF984D', fontSize: '14px' }}>M✦S</span>
          </div>
          <div>
            <p className="font-bold text-white text-sm" style={{ fontFamily: 'Playfair Display, serif' }}>
              Mahara Style
            </p>
            <p className="text-xs" style={{ color: '#BF984D' }}>Gestion des factures</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all text-sm font-medium"
              style={{
                backgroundColor: isActive ? '#BF984D22' : 'transparent',
                color: isActive ? '#BF984D' : '#ffffff99',
                borderLeft: isActive ? '3px solid #BF984D' : '3px solid transparent',
              }}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t" style={{ borderColor: '#ffffff22' }}>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all"
          style={{ color: '#ffffff66' }}
        >
          <span>🚪</span>
          Se déconnecter
        </button>
      </div>
    </aside>
  )
}