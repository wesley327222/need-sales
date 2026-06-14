import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const tipo = searchParams.get('tipo') ?? 'reuniao'

  const supabase = await createClient()
  const table = tipo === 'ligacao' ? 'ligacoes' : 'reunioes'

  const { data, error } = await supabase.from(table).select('*').eq('id', id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json({ ...data, _tipo: tipo })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const tipo = searchParams.get('tipo') ?? 'reuniao'

  const supabase = await createClient()
  const table = tipo === 'ligacao' ? 'ligacoes' : 'reunioes'
  const body = await request.json()

  const { data, error } = await supabase.from(table).update(body).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const tipo = searchParams.get('tipo') ?? 'reuniao'

  const supabase = createServiceClient()
  const table = tipo === 'ligacao' ? 'ligacoes' : 'reunioes'

  const { error } = await supabase.from(table).delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
