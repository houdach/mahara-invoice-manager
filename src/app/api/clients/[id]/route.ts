import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  // One single query — client + all invoices + all payments in one round trip
  const { data, error } = await supabaseAdmin
    .from('clients')
    .select(`
      id, name, phone, city,
      invoices (
        id, number, date, status, total,
        payments ( amount )
      )
    `)
    .eq('id', params.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const invoicesWithBalance = (data.invoices || []).map((inv: any) => {
    const totalPaid = inv.payments?.reduce((s: number, p: any) => s + Number(p.amount), 0) || 0
    return { ...inv, total_paid: totalPaid, remaining: Number(inv.total) - totalPaid }
  }).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const totalInvoiced = invoicesWithBalance.reduce((s: number, inv: any) => s + Number(inv.total), 0)
  const totalPaid = invoicesWithBalance.reduce((s: number, inv: any) => s + inv.total_paid, 0)

  return NextResponse.json({
    ...data,
    invoices: invoicesWithBalance,
    total_invoiced: totalInvoiced,
    total_paid: totalPaid,
    total_remaining: totalInvoiced - totalPaid,
  })
}