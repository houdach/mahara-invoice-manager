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
    .from('invoices')
    .select(`
      *,
      clients ( id, name, phone, city ),
      invoice_items ( id, photo_base64, quantity, unit_price, note ),
      payments ( id, amount, date, note, origine )
    `)
    .eq('id', params.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const totalPaid = data.payments?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0
  const remaining = Number(data.total) - totalPaid

  return NextResponse.json({ ...data, total_paid: totalPaid, remaining })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const { date, validity, items } = body

  if (!items?.length) {
    return NextResponse.json({ error: 'Au moins un article requis' }, { status: 400 })
  }

  const total = items.reduce((sum: number, item: any) => {
    return sum + item.quantity * item.unit_price
  }, 0)

  const { error: invoiceError } = await supabaseAdmin
    .from('invoices')
    .update({ date, validity, total, updated_at: new Date().toISOString() })
    .eq('id', params.id)

  if (invoiceError) return NextResponse.json({ error: invoiceError.message }, { status: 500 })

  const { error: deleteError } = await supabaseAdmin
    .from('invoice_items')
    .delete()
    .eq('invoice_id', params.id)

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

  // Include note field when reinserting items
  const itemsToInsert = items.map((item: any) => ({
    invoice_id: params.id,
    photo_base64: item.photo_base64 || null,
    quantity: item.quantity,
    unit_price: item.unit_price,
    note: item.note || null,
  }))

  const { error: itemsError } = await supabaseAdmin
    .from('invoice_items')
    .insert(itemsToInsert)

  if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 })

  const { data: allPayments } = await supabaseAdmin
    .from('payments')
    .select('amount')
    .eq('invoice_id', params.id)

  const totalPaid = allPayments?.reduce((s, p) => s + Number(p.amount), 0) || 0
  const newStatus = totalPaid >= total ? 'Soldé' : totalPaid > 0 ? 'Partiel' : 'En attente'

  await supabaseAdmin
    .from('invoices')
    .update({ status: newStatus })
    .eq('id', params.id)

  return NextResponse.json({ success: true }, { status: 200 })
}