'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

import { MAHARA_LOGO } from '@/lib/logo'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const form = e.currentTarget
    const username = (form.elements.namedItem('username') as HTMLInputElement).value
    const password = (form.elements.namedItem('password') as HTMLInputElement).value

    const result = await signIn('credentials', {
      username,
      password,
      redirect: false,
    })

    if (result?.error) {
      setError('Identifiants incorrects')
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: '#FAF3EE' }}
    >
      {/* Background pattern */}
      <div
        className="fixed inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: `repeating-linear-gradient(
            45deg,
            #702434 0px,
            #702434 1px,
            transparent 1px,
            transparent 20px
          ), repeating-linear-gradient(
            -45deg,
            #702434 0px,
            #702434 1px,
            transparent 1px,
            transparent 20px
          )`,
        }}
      />

      <div className="w-full max-w-sm relative">

        {/* Logo + brand */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-28 h-28 rounded-full mb-5"
            style={{ backgroundColor: '#702434' }}
          >
            <img
              src={MAHARA_LOGO}
              alt="Mahara Style Logo"
              style={{ width: '108px', height: '108px', objectFit: 'contain' }}
            />
          </div>
          <h1
            className="text-3xl font-bold"
            style={{ color: '#702434', fontFamily: 'Georgia, serif', letterSpacing: '1px' }}
          >
            MAHARA STYLE
          </h1>
          <p className="text-xs mt-2 tracking-wider" style={{ color: '#BF984D' }}>
            COOPÉRATIVE AL MAHARA AL HIRAFIA
          </p>
          <div className="w-16 h-px mx-auto mt-4" style={{ backgroundColor: '#BF984D' }} />
        </div>

        {/* Card */}
        <div
          className="bg-white rounded-2xl shadow-sm border p-8"
          style={{ borderColor: '#BF984D33' }}
        >
          <p
            className="text-center text-sm font-medium mb-6"
            style={{ color: '#702434' }}
          >
            Gestion des factures
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold mb-1.5 tracking-wide" style={{ color: '#702434' }}>
                IDENTIFIANT
              </label>
              <input
                name="username"
                type="text"
                required
                autoComplete="username"
                className="w-full px-4 py-3 rounded-xl border outline-none transition text-sm"
                style={{
                  borderColor: '#BF984D44',
                  backgroundColor: '#FAF3EE',
                  color: '#1a1a1a',
                }}
                onFocus={(e) => e.target.style.borderColor = '#702434'}
                onBlur={(e) => e.target.style.borderColor = '#BF984D44'}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1.5 tracking-wide" style={{ color: '#702434' }}>
                MOT DE PASSE
              </label>
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="w-full px-4 py-3 rounded-xl border outline-none transition text-sm"
                style={{
                  borderColor: '#BF984D44',
                  backgroundColor: '#FAF3EE',
                  color: '#1a1a1a',
                }}
                onFocus={(e) => e.target.style.borderColor = '#702434'}
                onBlur={(e) => e.target.style.borderColor = '#BF984D44'}
              />
            </div>

            {error && (
              <div
                className="px-4 py-3 rounded-xl text-sm text-center"
                style={{ backgroundColor: '#fef2f2', color: '#dc2626' }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-semibold text-white text-sm tracking-wide transition mt-2"
              style={{
                backgroundColor: loading ? '#BF984D' : '#702434',
                letterSpacing: '0.5px',
              }}
            >
              {loading ? 'Connexion...' : 'SE CONNECTER'}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs mt-6" style={{ color: '#BF984D99' }}>
          maharastyle.ma · Marrakech, Maroc
        </p>
      </div>
    </div>
  )
}