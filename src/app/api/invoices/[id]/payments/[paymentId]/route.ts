import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; paymentId: string } }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  // Delete the specific payment (invoice_id guard for safety)
  const { error: deleteError } = await supabaseAdmin
    .from('payments')
    .delete()
    .eq('id', params.paymentId)
    .eq('invoice_id', params.id)

  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })

  // Recalculate total paid and update invoice status
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

  const newStatus =
    totalPaid >= invoiceTotal ? 'Soldé' :
    totalPaid > 0 ? 'Partiel' :
    'En attente'

  await supabaseAdmin
    .from('invoices')
    .update({ status: newStatus })
    .eq('id', params.id)

  return NextResponse.json({ ok: true })
}
