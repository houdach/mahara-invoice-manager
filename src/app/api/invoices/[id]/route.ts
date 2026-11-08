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
      invoice_items ( id, photo_base64, photo_url, quantity, unit_price, note ),
      payments ( id, amount, date, note, origine )
    `)
    .eq('id', params.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const totalPaid = data.payments?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0
  const remaining = Number(data.total) - totalPaid

  const itemsTotal = data.invoice_items?.reduce(
    (sum: number, it: any) => sum + Number(it.quantity) * Number(it.unit_price),
    0
  ) || 0

  let parsedAuthor = data.created_by || ''
  let metaSolde = 0
  let metaNote: string | null = null
  let metaDate: string | null = null

  if (parsedAuthor.includes('__meta__')) {
    const parts = parsedAuthor.split('__meta__')
    parsedAuthor = parts[0]
    try {
      const parsed = JSON.parse(parts[1])
      if (parsed.s !== undefined) metaSolde = Number(parsed.s)
      if (parsed.n) metaNote = parsed.n
      if (parsed.d) metaDate = parsed.d
    } catch (_) {}
  }

  let resolvedAncienSolde = 0
  if (data.ancien_solde !== undefined && data.ancien_solde !== null && Number(data.ancien_solde) > 0) {
    resolvedAncienSolde = Number(data.ancien_solde)
  } else if (metaSolde > 0) {
    resolvedAncienSolde = metaSolde
  } else if (Number(data.total) > itemsTotal) {
    resolvedAncienSolde = Number(data.total) - itemsTotal
  }

  const resolvedNote = data.ancien_solde_note || metaNote || null
  const resolvedDate = data.ancien_solde_date || metaDate || null

  return NextResponse.json({
    ...data,
    created_by: parsedAuthor,
    ancien_solde: resolvedAncienSolde,
    ancien_solde_note: resolvedNote,
    ancien_solde_date: resolvedDate,
    total_paid: totalPaid,
    remaining,
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const { date, validity, items, ancienSolde, ancienSoldeNote, ancienSoldeDate } = body

  if (!items?.length) {
    return NextResponse.json({ error: 'Au moins un article requis' }, { status: 400 })
  }

  const itemsTotal = items.reduce((sum: number, item: any) => {
    return sum + item.quantity * item.unit_price
  }, 0)
  const ancienSoldeNum = parseFloat(ancienSolde) || 0
  const total = itemsTotal + ancienSoldeNum

  const updatePayload: any = {
    date,
    validity,
    total,
    updated_at: new Date().toISOString(),
  }

  let updateRes = await supabaseAdmin
    .from('invoices')
    .update({
      ...updatePayload,
      ancien_solde: ancienSoldeNum,
      ancien_solde_note: ancienSoldeNote || null,
      ancien_solde_date: ancienSoldeDate || null,
    })
    .eq('id', params.id)

  const isMissingColumnError =
    updateRes.error &&
    (updateRes.error.code === '42703' ||
      updateRes.error.code === 'PGRST204' ||
      updateRes.error.message?.includes('column') ||
      updateRes.error.message?.includes('schema cache'))

  if (isMissingColumnError) {
    const { data: cur } = await supabaseAdmin
      .from('invoices')
      .select('created_by')
      .eq('id', params.id)
      .single()
    const rawAuthor = (cur?.created_by || '').split('__meta__')[0] || 'houda'
    const metaStr =
      ancienSoldeNum > 0 || ancienSoldeNote || ancienSoldeDate
        ? `__meta__${JSON.stringify({
            s: ancienSoldeNum,
            n: (ancienSoldeNote || '').trim(),
            d: ancienSoldeDate || null,
          })}`
        : ''

    updateRes = await supabaseAdmin
      .from('invoices')
      .update({
        ...updatePayload,
        created_by: `${rawAuthor}${metaStr}`,
      })
      .eq('id', params.id)
  }

  if (updateRes.error) return NextResponse.json({ error: updateRes.error.message }, { status: 500 })

  const { error: deleteError } = await supabaseAdmin
    .from('invoice_items')
    .delete()
    .eq('invoice_id', params.id)

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

  // Include note field when reinserting items
  const itemsToInsert = items.map((item: any) => ({
    invoice_id: params.id,
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

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const role = (session.user as any)?.role
  if (role !== 'admin') {
    return NextResponse.json({ error: 'Seul un administrateur peut supprimer une facture' }, { status: 403 })
  }

  const { error: itemsErr } = await supabaseAdmin.from('invoice_items').delete().eq('invoice_id', params.id)
  if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 })

  const { error: payErr } = await supabaseAdmin.from('payments').delete().eq('invoice_id', params.id)
  if (payErr) return NextResponse.json({ error: payErr.message }, { status: 500 })

  const { error: invErr } = await supabaseAdmin.from('invoices').delete().eq('id', params.id)
  if (invErr) return NextResponse.json({ error: invErr.message }, { status: 500 })

  return NextResponse.json({ success: true })
}