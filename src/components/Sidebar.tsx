'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useState } from 'react'

import { MAHARA_LOGO } from '@/lib/logo'

const navItems = [
  { href: '/dashboard', label: 'Tableau de bord', icon: '▦' },
  { href: '/dashboard/clients', label: 'Clients', icon: '👥' },
  { href: '/dashboard/invoices', label: 'Factures', icon: '📄' },
]

export default function Sidebar() {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="p-6 border-b" style={{ borderColor: '#ffffff22' }}>
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 overflow-hidden"
            style={{ backgroundColor: '#702434' }}
          >
            <img src={MAHARA_LOGO} alt="Mahara Style Logo" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
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
              onClick={() => setMobileOpen(false)}
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
    </>
  )

  return (
    <>
      {/* ── DESKTOP SIDEBAR ── */}
      <aside
        className="hidden md:flex fixed left-0 top-0 h-full w-64 flex-col shadow-sm z-30"
        style={{ backgroundColor: '#702434' }}
      >
        <SidebarContent />
      </aside>

      {/* ── MOBILE TOP BAR ── */}
      <div
        className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3 shadow-sm"
        style={{ backgroundColor: '#702434' }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden"
            style={{ backgroundColor: '#702434' }}
          >
            <img src={MAHARA_LOGO} alt="Mahara Style Logo" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
          </div>
          <span className="font-bold text-white text-sm" style={{ fontFamily: 'Playfair Display, serif' }}>
            Mahara Style
          </span>
        </div>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="text-white p-1"
        >
          {mobileOpen ? '✕' : '☰'}
        </button>
      </div>

      {/* ── MOBILE DRAWER ── */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 z-40"
            style={{ backgroundColor: '#00000066' }}
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <aside
            className="md:hidden fixed left-0 top-0 h-full w-72 flex flex-col z-50 shadow-xl"
            style={{ backgroundColor: '#702434' }}
          >
            <SidebarContent />
          </aside>
        </>
      )}
    </>
  )
}