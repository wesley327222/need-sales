import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const tipo  = searchParams.get('tipo') // 'reuniao' | 'ligacao' | null (both)
  const page  = Math.max(1, parseInt(searchParams.get('page')  ?? '1'))
  const limit = Math.min(50, parseInt(searchParams.get('limit') ?? '20'))
  const from  = (page - 1) * limit
  const to    = from + limit - 1

  const table = tipo === 'ligacao' ? 'ligacoes' : 'reunioes'

  const { data, error, count } = await supabase
    .from(table)
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    data,
    _tipo: table,
    meta: { page, limit, total: count ?? 0, totalPages: Math.ceil((count ?? 0) / limit) },
  })
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('empresa_id')
    .eq('id', user.id)
    .single()

  if (!profile?.empresa_id) {
    return NextResponse.json({ error: 'Empresa não encontrada para o usuário' }, { status: 400 })
  }

  const body = await request.json()
  const tipo = body.tipo ?? 'reuniao'
  const table = tipo === 'ligacao' ? 'ligacoes' : 'reunioes'

  const baseFields = {
    titulo: body.titulo ?? body.title ?? 'Sem título',
    vendedor_id: body.vendedor_id ?? user.id,
    empresa_id: profile.empresa_id,
    audio_url: body.audio_url,
    audio_filename: body.audio_filename ?? null,
    status: 'pending' as const,
    cliente_id: body.cliente_id ?? null,
  }

  const extraFields = tipo === 'ligacao'
    ? { data_hora: body.data_hora ?? null, lote_id: body.lote_id ?? null }
    : { data_hora: body.data_hora ?? null }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await supabase
    .from(table)
    .insert({ ...baseFields, ...extraFields } as any)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ...data, _tipo: tipo }, { status: 201 })
}
