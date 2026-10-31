import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  // All users see all invoices.
  // Role only affects edit permissions (handled in the UI and detail page).
  let query = supabaseAdmin
    .from('invoices')
    .select(`
      *,
      clients ( name, city ),
      payments ( amount )
    `)
    .order('created_at', { ascending: false })

  // Apply date range filter if provided
  if (from) query = query.gte('date', from)
  if (to) query = query.lte('date', to)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const invoices = data.map((inv: any) => {
    const totalPaid = inv.payments?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0
    return {
      ...inv,
      ancien_solde: Number(inv.ancien_solde || 0),
      ancien_solde_note: inv.ancien_solde_note || null,
      total_paid: totalPaid,
      remaining: Number(inv.total) - totalPaid,
    }
  })

  return NextResponse.json(invoices)
}

export async function POST(req: NextRequest) {
  // Allow store integration via shared API key (no session required)
  const apiKey = req.headers.get('x-api-key')
  const validKey = process.env.STORE_API_KEY
  const isApiKeyAuth = validKey && apiKey === validKey

  if (!isApiKeyAuth) {
    const session = await getServerSession(authOptions)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  // Save actual username as created_by
  const session = isApiKeyAuth ? null : await getServerSession(authOptions)
  const createdBy = isApiKeyAuth ? 'Store (API)' : (session?.user?.name || 'Inconnu')


  const body = await req.json()
  const { clientName, clientId, clientPhone, clientCity, date, validity, items, initialPayments, ancienSolde, ancienSoldeNote } = body

  if (!clientName || !items?.length) {
    return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
  }

  // Step 1 — get or create client
  let finalClientId = clientId

  if (!finalClientId) {
    const { data: existing } = await supabaseAdmin
      .from('clients')
      .select('id')
      .ilike('name', clientName.trim())
      .single()

    if (existing) {
      finalClientId = existing.id
    } else {
      const { data: newClient, error: clientError } = await supabaseAdmin
        .from('clients')
        .insert({ name: clientName.trim(), phone: clientPhone || null, city: clientCity || null })
        .select()
        .single()

      if (clientError) return NextResponse.json({ error: clientError.message }, { status: 500 })
      finalClientId = newClient.id
    }
  }

  // Step 2 — generate invoice number per client
  const clientShortId = finalClientId.slice(0, 6).toUpperCase()
  const { count } = await supabaseAdmin
    .from('invoices')
    .select('*', { count: 'exact', head: true })
    .eq('client_id', finalClientId)

  const invoiceNumber = `PF-${clientShortId}-${new Date().getFullYear()}-${String((count || 0) + 1).padStart(4, '0')}`

  // Step 3 — calculate total (items + ancien solde)
  const itemsTotal = items.reduce((sum: number, item: any) => sum + item.quantity * item.unit_price, 0)
  const ancienSoldeNum = parseFloat(ancienSolde) || 0
  const total = itemsTotal + ancienSoldeNum

  // Step 4 — create invoice with created_by
  const invoicePayload: any = {
    number: invoiceNumber,
    client_id: finalClientId,
    date,
    validity,
    total,
    status: 'En attente',
    created_by: createdBy,
  }

  let invoice: any = null
  let invoiceError: any = null

  // Try insert with ancien_solde columns
  const resWithSolde = await supabaseAdmin
    .from('invoices')
    .insert({
      ...invoicePayload,
      ancien_solde: ancienSoldeNum,
      ancien_solde_note: ancienSoldeNote || null,
    })
    .select()
    .single()

  if (resWithSolde.error && resWithSolde.error.code === '42703') {
    // If migration hasn't been run yet in Supabase, fall back to base columns
    const resFallback = await supabaseAdmin
      .from('invoices')
      .insert(invoicePayload)
      .select()
      .single()
    invoice = resFallback.data
    invoiceError = resFallback.error
  } else {
    invoice = resWithSolde.data
    invoiceError = resWithSolde.error
  }

  if (invoiceError) return NextResponse.json({ error: invoiceError.message }, { status: 500 })

  // Step 5 — save line items
  const itemsToInsert = items.map((item: any) => ({
    invoice_id: invoice.id,
    photo_base64: item.photo_base64 || null,
    photo_url: item.photo_url || null,
    quantity: item.quantity,
    unit_price: item.unit_price,
    note: item.note || null,
  }))

  const { error: itemsError } = await supabaseAdmin
    .from('invoice_items')
    .insert(itemsToInsert)

  if (itemsError) return NextResponse.json({ error: itemsError.message }, { status: 500 })

  // Step 6 — save initial payments
  if (initialPayments && initialPayments.length > 0) {
    const validPayments = initialPayments.filter((p: any) => p.amount > 0)
    if (validPayments.length > 0) {
      const paymentsToInsert = validPayments.map((p: any) => ({
        invoice_id: invoice.id,
        amount: Number(p.amount),
        date: p.date,
        note: p.note || null,
        origine: p.origine || null,
      }))

      const { error: paymentsError } = await supabaseAdmin
        .from('payments')
        .insert(paymentsToInsert)

      if (paymentsError) return NextResponse.json({ error: paymentsError.message }, { status: 500 })

      const totalPaid = validPayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0)
      const newStatus = totalPaid >= total ? 'Soldé' : totalPaid > 0 ? 'Partiel' : 'En attente'

      await supabaseAdmin
        .from('invoices')
        .update({ status: newStatus })
        .eq('id', invoice.id)
    }
  }

  return NextResponse.json(invoice, { status: 201 })
}