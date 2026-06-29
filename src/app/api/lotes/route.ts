import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { data: profile } = await service
    .from('profiles').select('empresa_id').eq('id', user.id).single()
  if (!profile?.empresa_id) {
    return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 400 })
  }

  const body = await request.json()
  const { nome, total_ligacoes, arquivo_zip_url, vendedor_id, periodo_inicio, periodo_fim } = body

  if (!nome || !total_ligacoes) {
    return NextResponse.json({ error: 'nome e total_ligacoes são obrigatórios' }, { status: 400 })
  }

  const { data, error } = await service
    .from('ligacoes_lotes')
    .insert({
      empresa_id:           profile.empresa_id,
      vendedor_id:          vendedor_id ?? user.id,
      nome,
      total_ligacoes,
      ligacoes_processadas: 0,
      arquivo_zip_url:      arquivo_zip_url ?? null,
      periodo_inicio:       periodo_inicio ?? null,
      periodo_fim:          periodo_fim ?? null,
      status:               'processing',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

/** Ajusta total_ligacoes (ex: quando alguns arquivos do pack falham ao serem criados). */
export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, total_ligacoes } = await request.json()
  if (!id || typeof total_ligacoes !== 'number') {
    return NextResponse.json({ error: 'id e total_ligacoes são obrigatórios' }, { status: 400 })
  }

  const service = createServiceClient()
  const { error } = await service
    .from('ligacoes_lotes')
    .update({ total_ligacoes, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
