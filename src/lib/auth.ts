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
        const adminUsername = process.env.OWNER_USERNAME
        const adminPassword = process.env.OWNER_PASSWORD
        const workerUsername = process.env.WORKER_USERNAME
        const workerPassword = process.env.WORKER_PASSWORD

        if (
          credentials?.username === adminUsername &&
          credentials?.password === adminPassword
        ) {
          return {
            id: 'admin',
            name: credentials.username, // actual username, not hardcoded label
            email: 'admin@maharastyle.ma',
            role: 'admin',
          }
        }

        if (
          credentials?.username === workerUsername &&
          credentials?.password === workerPassword
        ) {
          return {
            id: 'worker',
            name: credentials.username, // actual username, not hardcoded label
            email: 'worker@maharastyle.ma',
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