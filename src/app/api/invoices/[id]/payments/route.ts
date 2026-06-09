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

  const { data, error } = await supabaseAdmin
    .from('payments')
    .select('*')
    .eq('invoice_id', params.id)
    .order('date', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const { amount, date, note, origine } = body

  if (!amount || !date) {
    return NextResponse.json({ error: 'Montant et date requis' }, { status: 400 })
  }

  // Step 1 — insert the payment
  const { data: payment, error: paymentError } = await supabaseAdmin
    .from('payments')
    .insert({ invoice_id: params.id, amount: Number(amount), date, note: note || null, origine: origine || null })
    .select()
    .single()

  if (paymentError) return NextResponse.json({ error: paymentError.message }, { status: 500 })

  // Step 2 — recalculate total paid and update invoice status
  // We fetch all payments fresh to get the accurate sum
  const { data: allPayments } = await supabaseAdmin
    .from('payments')
    .select('amount')
    .eq('invoice_id', params.id)

  const { data: invoice } = await supabaseAdmin
    .from('invoices')
    .select('total')
    .eq('id', params.id)
    .single()

  const totalPaid = allPayments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0
  const invoiceTotal = Number(invoice?.total || 0)

  // Status logic: if fully paid → Soldé, if partially paid → Partiel, else → En attente
  const newStatus =
    totalPaid >= invoiceTotal ? 'Soldé' :
    totalPaid > 0 ? 'Partiel' :
    'En attente'

  await supabaseAdmin
    .from('invoices')
    .update({ status: newStatus })
    .eq('id', params.id)

  return NextResponse.json(payment, { status: 201 })
}