import { createServiceClient } from '@/lib/supabase/server'

export interface CriterioConfig {
  peso: number   // 1–5
}

export interface AiConfig {
  criterios:    Record<string, CriterioConfig>
  conhecimentos: string | null
}

// Criteria definitions per tipo
export const CRITERIOS_REUNIAO = [
  { key: 'escuta_ativa',       label: 'Escuta Ativa',           desc: 'Perguntas abertas, empatia, adaptação ao cliente' },
  { key: 'quebra_objecoes',    label: 'Quebra de Objeções',     desc: 'Identificação e resposta às objeções do cliente' },
  { key: 'apresentacao',       label: 'Apresentação do Produto', desc: 'Clareza, benefícios, provas sociais, urgência' },
  { key: 'spin_selling',       label: 'SPIN Selling',            desc: 'Uso de perguntas de Situação, Problema, Implicação e Necessidade' },
  { key: 'firmeza',            label: 'Firmeza / Assertividade', desc: 'Condução segura, sem hesitação, postura de autoridade' },
  { key: 'rapport',            label: 'Rapport / Empatia',       desc: 'Conexão humana, tom empático, clima de confiança' },
  { key: 'urgencia',           label: 'Criação de Urgência',     desc: 'Motivação para decisão rápida sem pressão excessiva' },
] as const

export const CRITERIOS_LIGACAO = [
  { key: 'acesso_decisor',       label: 'Acesso ao Decisor',       desc: 'Conseguiu falar com quem decide a compra' },
  { key: 'explicacao_motivo',    label: 'Explicação do Motivo',     desc: 'Clareza na razão do contato e proposta de valor' },
  { key: 'geracao_curiosidade',  label: 'Geração de Curiosidade',   desc: 'Despertou interesse real no produto/solução' },
  { key: 'conducao_conversa',    label: 'Condução da Conversa',     desc: 'Controle do diálogo, guia do prospect' },
  { key: 'pedido_reuniao',       label: 'Pedido de Reunião',        desc: 'Tentativa efetiva de agendar próximo passo' },
  { key: 'firmeza',              label: 'Firmeza / Assertividade',  desc: 'Tom seguro, sem hesitação, postura de autoridade' },
  { key: 'tonalidade',           label: 'Tom de Voz / Confiança',   desc: 'Voz assertiva, ritmo adequado, confiança transmitida' },
] as const

const PESO_LABEL: Record<number, string> = {
  1: 'MÍNIMO — avalie brevemente, peso baixíssimo na análise',
  2: 'SECUNDÁRIO — avalie com atenção reduzida',
  3: 'MODERADO — avalie normalmente',
  4: 'IMPORTANTE — avalie com atenção elevada',
  5: 'ESSENCIAL — critério principal, avalie com rigor máximo e seja exigente',
}

export function buildConfigPrompt(config: AiConfig, tipo: 'reuniao' | 'ligacao'): string {
  const criterios = tipo === 'reuniao' ? CRITERIOS_REUNIAO : CRITERIOS_LIGACAO
  const lines: string[] = []

  const hasPesos = criterios.some(c => config.criterios[c.key]?.peso != null)
  if (hasPesos) {
    lines.push('CONFIGURAÇÃO DE AVALIAÇÃO PERSONALIZADA PELA EMPRESA:')
    lines.push('Pesos dos critérios (siga estas prioridades rigorosamente ao atribuir notas):')
    for (const c of criterios) {
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

  return lines.length > 0 ? lines.join('\n') : ''
}

export async function fetchAiConfig(empresaId: string, tipo: 'reuniao' | 'ligacao'): Promise<AiConfig | null> {
  const service = createServiceClient()
  const { data } = await service
    .from('ai_config')
    .select('criterios, conhecimentos')
    .eq('empresa_id', empresaId)
    .eq('tipo', tipo)
    .single()

  if (!data) return null
  return {
    criterios:    (data.criterios as unknown as Record<string, CriterioConfig>) ?? {},
    conhecimentos: data.conhecimentos ?? null,
  }
}
