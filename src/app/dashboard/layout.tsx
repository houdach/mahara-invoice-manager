import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/Sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect('/login')

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#FAF3EE' }}>
      <Sidebar />
      {/* 
        On desktop: ml-64 to account for fixed sidebar width
        On mobile: no margin left, but pt-16 to account for the fixed top bar
      */}
      <main className="flex-1 md:ml-64 pt-16 md:pt-0 p-4 md:p-8">
        {children}
      </main>
    </div>
  )
}