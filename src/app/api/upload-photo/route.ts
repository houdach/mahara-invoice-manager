import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { base64, fileName } = await req.json()

  if (!base64 || !fileName) {
    return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
  }

  // Strip the data URL prefix and convert to a buffer
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, '')
  const buffer = Buffer.from(base64Data, 'base64')

  const { error: uploadError } = await supabaseAdmin.storage
    .from('invoice-photos')
    .upload(fileName, buffer, { contentType: 'image/jpeg', upsert: false })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data } = supabaseAdmin.storage
    .from('invoice-photos')
    .getPublicUrl(fileName)

  return NextResponse.json({ url: data.publicUrl })
}
