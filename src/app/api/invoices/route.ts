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

  // ✅ initialPayments is now destructured from the request body
  // Previously it was missing here, which is why Step 6 threw a ReferenceError
  const { clientName, clientId, clientPhone, clientCity, date, validity, items, initialPayments } = body

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
  // Step 2 — generate invoice number per client
// Format: PF-{clientShortId}-{year}-{count}
// clientShortId = first 6 chars of the client UUID, enough to differentiate
const clientShortId = finalClientId.slice(0, 6).toUpperCase()

const { count } = await supabaseAdmin
  .from('invoices')
  .select('*', { count: 'exact', head: true })
  .eq('client_id', finalClientId)

const invoiceNumber = `PF-${clientShortId}-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(4, '0')}`// Step 3 — calculate total from line items
  const total = items.reduce((sum: number, item: any) => {
    return sum + item.quantity * item.unit_price
  }, 0)

  // Step 4 — create the invoice record
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

  // Step 5 — save line items (photos stored as base64)
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

  // Step 6 — save initial payments if the owner recorded any upfront
  // initialPayments is optional — most invoices will have none at creation time
  if (initialPayments && initialPayments.length > 0) {
    const paymentsToInsert = initialPayments.map((p: any) => ({
      invoice_id: invoice.id,
      amount: Number(p.amount),
      date: p.date,
      note: p.note || null,
    }))

    const { error: paymentsError } = await supabaseAdmin
      .from('payments')
      .insert(paymentsToInsert)

    if (paymentsError) return NextResponse.json({ error: paymentsError.message }, { status: 500 })

    // Recalculate status now that we know how much was paid upfront
    // Soldé = fully paid, Partiel = partially paid, En attente = nothing paid yet
    const totalPaid = initialPayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0)
    const newStatus = totalPaid >= total ? 'Soldé' : totalPaid > 0 ? 'Partiel' : 'En attente'

    await supabaseAdmin
      .from('invoices')
      .update({ status: newStatus })
      .eq('id', invoice.id)
  }

  return NextResponse.json(invoice, { status: 201 })
}