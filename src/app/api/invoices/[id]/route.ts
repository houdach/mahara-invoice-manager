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
      invoice_items ( id, photo_base64, quantity, unit_price ),
      payments ( id, amount, date, note )
    `)
    .eq('id', params.id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Calculate derived values
  const totalPaid = data.payments?.reduce((sum: number, p: any) => sum + Number(p.amount), 0) || 0
  const remaining = Number(data.total) - totalPaid

  return NextResponse.json({ ...data, total_paid: totalPaid, remaining })
}