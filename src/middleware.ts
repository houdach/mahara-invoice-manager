import { withAuth } from 'next-auth/middleware'

// `next-auth/middleware`'s default export doesn't know about the custom
// sign-in page configured in `authOptions.pages.signIn` (@/lib/auth), so
// unauthenticated visits to any protected page (e.g. /dashboard) were being
// redirected to NextAuth's generic built-in `/api/auth/signin` page instead
// of our own `/login` page. Passing `pages` here fixes that.
export default withAuth({
  pages: {
    signIn: '/login',
  },
})

export const config = {
  matcher: ['/((?!login|api|_next/static|_next/image|favicon.ico).*)'],
}