import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { getCriteriaDefs, MAX_OPTIONAL_CRITERIA } from '@/lib/criteria-definitions'
import type { CriterioConfig } from '@/lib/ai-config'
import type { Json } from '@/lib/types/database'

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
    .select('criterios, conhecimentos, qualificacao_lead_prompt')
    .eq('empresa_id', empresaId)
    .eq('tipo', tipo)
    .single()

  return NextResponse.json(data ?? null)
}

export async function POST(request: Request) {
  const { tipo, criterios, conhecimentos, qualificacao_lead_prompt } = await request.json()

  const tipoTyped = (tipo === 'ligacao' ? 'ligacao' : 'reuniao') as 'reuniao' | 'ligacao'
  const defs = getCriteriaDefs(tipoTyped)
  const rawCriterios = (criterios ?? {}) as Record<string, Partial<CriterioConfig>>

  const clampPeso = (p: unknown) => {
    const n = Math.round(Number(p))
    return Number.isFinite(n) ? Math.min(5, Math.max(1, n)) : 3
  }

  // Conta quantos opcionais o cliente marcou como ativos, antes de qualquer ajuste
  const optionalKeys = defs.filter(d => !d.obrigatorio).map(d => d.key)
  const activeOptionalCount = optionalKeys.filter(key => rawCriterios[key]?.ativo === true).length
  if (activeOptionalCount > MAX_OPTIONAL_CRITERIA) {
    return NextResponse.json(
      { error: `Máximo de ${MAX_OPTIONAL_CRITERIA} critérios opcionais permitidos` },
      { status: 400 }
    )
  }

  // Reconstrói o objeto criterios só com chaves conhecidas, forçando ativo:true nos obrigatórios
  const sanitized: Record<string, CriterioConfig> = {}
  for (const def of defs) {
    const incoming = rawCriterios[def.key]
    sanitized[def.key] = {
      peso: clampPeso(incoming?.peso),
      ativo: def.obrigatorio ? true : incoming?.ativo === true,
    }
  }

  const empresaId = await getEmpresaId()
  if (!empresaId) return NextResponse.json({ error: 'Empresa não encontrada' }, { status: 401 })

  const service = createServiceClient()
  const { error } = await service.from('ai_config').upsert({
    empresa_id: empresaId,
    tipo: tipoTyped,
    criterios: sanitized as unknown as Json,
    conhecimentos: conhecimentos || null,
    qualificacao_lead_prompt: qualificacao_lead_prompt || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'empresa_id,tipo' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
