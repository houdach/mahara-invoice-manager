'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

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
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FAF3EE' }}>
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full border-2 mb-4" style={{ borderColor: '#702434' }}>
            <span className="text-2xl font-bold" style={{ color: '#702434', fontFamily: 'Playfair Display, serif' }}>M✦S</span>
          </div>
          <h1 className="text-2xl font-bold" style={{ color: '#702434', fontFamily: 'Playfair Display, serif' }}>
            Mahara Style
          </h1>
          <p className="text-sm mt-1" style={{ color: '#BF984D' }}>Gestion des factures</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-sm border p-8" style={{ borderColor: '#BF984D22' }}>
          <form onSubmit={handleSubmit} className="space-y-5">

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#702434' }}>
                Identifiant
              </label>
              <input
                name="username"
                type="text"
                required
                className="w-full px-4 py-3 rounded-xl border outline-none transition"
                style={{ borderColor: '#BF984D55', backgroundColor: '#FAF3EE' }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#702434' }}>
                Mot de passe
              </label>
              <input
                name="password"
                type="password"
                required
                className="w-full px-4 py-3 rounded-xl border outline-none transition"
                style={{ borderColor: '#BF984D55', backgroundColor: '#FAF3EE' }}
              />
            </div>

            {error && (
              <p className="text-sm text-red-600 text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-white transition"
              style={{ backgroundColor: loading ? '#BF984D' : '#702434' }}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>

          </form>
        </div>

      </div>
    </div>
  )
}