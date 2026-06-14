import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

async function getEmpresaId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const service = createServiceClient()
  const { data } = await service.from('profiles').select('empresa_id').eq('id', user.id).single()
  return data?.empresa_id ?? null
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const tipoRaw = searchParams.get('tipo') ?? 'reuniao'
  const tipo = (tipoRaw === 'ligacao' ? 'ligacao' : 'reuniao') as 'reuniao' | 'ligacao'

  const empresaId = await getEmpresaId()
  if (!empresaId) return NextResponse.json(null)

  const service = createServiceClient()
  const { data } = await service
    .from('ai_config')
    .select('criterios, conhecimentos')
    .eq('empresa_id', empresaId)
    .eq('tipo', tipo)
    .single()

  return NextResponse.json(data ?? null)
}

export async function POST(request: Request) {
  const { tipo, criterios, conhecimentos } = await request.json()

  const empresaId = await getEmpresaId()
  if (!empresaId) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 401 })

  const service = createServiceClient()
  const tipoTyped = tipo as 'reuniao' | 'ligacao'
  const { error } = await service.from('ai_config').upsert({
    empresa_id:   empresaId,
    tipo:         tipoTyped,
    criterios:    criterios ?? {},
    conhecimentos: conhecimentos || null,
    updated_at:   new Date().toISOString(),
  }, { onConflict: 'empresa_id,tipo' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
