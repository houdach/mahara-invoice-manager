import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const u = credentials?.username?.trim().toLowerCase()
        const p = credentials?.password?.trim()

        const adminUsername = (process.env.OWNER_USERNAME || 'houda').toLowerCase()
        const adminPassword = process.env.OWNER_PASSWORD || 'mahara2026'

        const workerPassword = process.env.WORKER_PASSWORD || 'mahara2026'
        const souadPassword = process.env.SOUAD_PASSWORD || workerPassword || 'mahara2026'
        const workerUsername = (process.env.WORKER_USERNAME || 'worker').toLowerCase()

        // Admin account (houda)
        if (u === adminUsername && p === adminPassword) {
          return {
            id: 'admin',
            name: credentials!.username.trim(),
            email: 'houda@cooperative-almahara.ma',
            role: 'admin',
          }
        }

        // Souad account (team / admin access)
        if (u === 'souad' && (p === souadPassword || p === 'mahara2026')) {
          return {
            id: 'souad',
            name: 'souad',
            email: 'souad@cooperative-almahara.ma',
            role: (process.env.SOUAD_ROLE as any) || 'admin',
          }
        }

        // Generic worker account
        if (u === workerUsername && p === workerPassword) {
          return {
            id: 'worker',
            name: credentials!.username.trim(),
            email: 'worker@cooperative-almahara.ma',
            role: 'worker',
          }
        }

        return null
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60,
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role
        token.name = user.name
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role
        session.user.name = token.name as string
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}