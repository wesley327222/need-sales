import { createServiceClient } from '@/lib/supabase/server'
import { getCriteriaDefs, MAX_OPTIONAL_CRITERIA, type CriterionDef } from '@/lib/criteria-definitions'

export interface CriterioConfig {
  peso:  number   // 1–5
  ativo: boolean  // obrigatórios são sempre true; opcionais conforme escolha do gestor
}

export interface AiConfig {
  criterios: Record<string, CriterioConfig>
  conhecimentos: string | null
  qualificacao_lead_prompt: string | null  // só relevante para tipo='ligacao'
}

export { CRITERIOS_REUNIAO, CRITERIOS_LIGACAO, MAX_OPTIONAL_CRITERIA } from '@/lib/criteria-definitions'

const PESO_LABEL: Record<number, string> = {
  1: 'MÍNIMO — avalie brevemente, peso baixíssimo na análise',
  2: 'SECUNDÁRIO — avalie com atenção reduzida',
  3: 'MODERADO — avalie normalmente',
  4: 'IMPORTANTE — avalie com atenção elevada',
  5: 'ESSENCIAL — critério principal, avalie com rigor máximo e seja exigente',
}

/**
 * Resolve quais critérios estão ativos para uma empresa: os obrigatórios (sempre)
 * mais os opcionais que o gestor marcou como ativos (máx. MAX_OPTIONAL_CRITERIA).
 * Sem config salva ainda, usa um default razoável (primeiros opcionais, peso 3).
 */
export function resolveActiveCriteria(
  config: AiConfig | null,
  tipo: 'reuniao' | 'ligacao'
): { mandatory: CriterionDef[]; optional: CriterionDef[] } {
  const defs = getCriteriaDefs(tipo)
  const mandatory = defs.filter(d => d.obrigatorio)
  const optionalPool = defs.filter(d => !d.obrigatorio)

  if (!config) {
    return { mandatory, optional: optionalPool.slice(0, MAX_OPTIONAL_CRITERIA) }
  }

  const optional = optionalPool.filter(d => config.criterios[d.key]?.ativo === true)
  return { mandatory, optional }
}

export function buildConfigPrompt(config: AiConfig | null, tipo: 'reuniao' | 'ligacao'): string {
  if (!config) return ''

  const { mandatory, optional } = resolveActiveCriteria(config, tipo)
  const active = [...mandatory, ...optional]
  const lines: string[] = []

  if (active.length > 0) {
    lines.push('CONFIGURAÇÃO DE AVALIAÇÃO PERSONALIZADA PELA EMPRESA:')
    lines.push('Pesos dos critérios (siga estas prioridades rigorosamente ao atribuir notas):')
    for (const c of active) {
      const peso = config.criterios[c.key]?.peso ?? 3
      lines.push(`- ${c.label}: ${PESO_LABEL[peso] ?? PESO_LABEL[3]}`)
    }
    lines.push('')
  }

  if (config.conhecimentos?.trim()) {
    lines.push('CONHECIMENTOS E CONTEXTO ESPECÍFICO DA EMPRESA:')
    lines.push('(Use estas informações para contextualizar a avaliação e identificar comportamentos ideais para este negócio)')
    lines.push(config.conhecimentos.trim())
    lines.push('')
  }

  if (tipo === 'ligacao' && config.qualificacao_lead_prompt?.trim()) {
    lines.push('CRITÉRIO DE LEAD QUALIFICADO DEFINIDO PELA EMPRESA:')
    lines.push('(Use isto para calibrar a avaliação de qualificacao_lead — autoridade_decisao e interesse_aparente)')
    lines.push(config.qualificacao_lead_prompt.trim())
    lines.push('')
  }

  return lines.length > 0 ? lines.join('\n') : ''
}

export async function fetchAiConfig(empresaId: string, tipo: 'reuniao' | 'ligacao'): Promise<AiConfig | null> {
  const service = createServiceClient()
  const { data } = await service
    .from('ai_config')
    .select('criterios, conhecimentos, qualificacao_lead_prompt')
    .eq('empresa_id', empresaId)
    .eq('tipo', tipo)
    .single()

  if (!data) return null
  return {
    criterios: (data.criterios as unknown as Record<string, CriterioConfig>) ?? {},
    conhecimentos: data.conhecimentos ?? null,
    qualificacao_lead_prompt: data.qualificacao_lead_prompt ?? null,
  }
}
