import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('invoices')
    .select(`
      *,
      clients ( name, city ),
      payments ( amount )
    `)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Calculate remaining balance per invoice
  const invoices = data.map((inv: any) => {
    const totalPaid = inv.payments?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0
    return {
      ...inv,
      total_paid: totalPaid,
      remaining: Number(inv.total) - totalPaid,
    }
  })

  return NextResponse.json(invoices)
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const { clientName, clientId, clientPhone, clientCity, date, validity, items } = body

  if (!clientName || !items?.length) {
    return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
  }

  // Step 1 — get or create client
  let finalClientId = clientId

  if (!finalClientId) {
    const { data: newClient, error: clientError } = await supabaseAdmin
      .from('clients')
      .insert({ name: clientName, phone: clientPhone || null, city: clientCity || null })
      .select()
      .single()

    if (clientError) return NextResponse.json({ error: clientError.message }, { status: 500 })
    finalClientId = newClient.id
  }

  // Step 2 — generate invoice number
  const { count } = await supabaseAdmin
    .from('invoices')
    .select('*', { count: 'exact', head: true })

  const invoiceNumber = `PF-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(4, '0')}`

  // Step 3 — calculate total
  const total = items.reduce((sum: number, item: any) => {
    return sum + item.quantity * item.unit_price
  }, 0)

  // Step 4 — create invoice
  const { data: invoice, error: invoiceError } = await supabaseAdmin
    .from('invoices')
    .insert({
      number: invoiceNumber,
      client_id: finalClientId,
      date,
      validity,
      total,
      status: 'En attente',
    })
    .select()
    .single()

  if (invoiceError) return NextResponse.json({ error: invoiceError.message }, { status: 500 })

  // Step 5 — save line items
  const itemsToInsert = items.map((item: any) => ({
    invoice_id: invoice.id,
    photo_base64: item.photo_base64 || null,
    quantity: item.quantity,
    unit_price: item.unit_price,
  }))

  const { error: itemsError } = await supabaseAdmin
    .from('invoice_items')
    .insert(itemsToInsert)

  if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 })

  return NextResponse.json(invoice, { status: 201 })
}