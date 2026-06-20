import { weightedAverage, type ScoredCriterion } from './scoring'
import { resolveActiveCriteria, type AiConfig } from '@/lib/ai-config'
import type { EvaluatorResult, SpinResult, FollowupsResult, LigacaoResultV2, ObjecaoAvaliada } from '@/lib/types/agents'
import type { Json } from '@/lib/types/database'

const REUNIAO_OPTIONAL_ORDER = ['escuta_ativa', 'apresentacao', 'firmeza', 'rapport', 'urgencia']
const LIGACAO_OPTIONAL_ORDER = ['acesso_decisor', 'explicacao_motivo', 'geracao_curiosidade', 'conducao_conversa', 'comunicacao']

function fillSlots(orderedKeys: string[], activeKeys: string[], notaOf: (key: string) => number | null) {
  const slots: (number | null)[] = [null, null, null, null]
  let i = 0
  for (const key of orderedKeys) {
    if (!activeKeys.includes(key)) continue
    if (i >= slots.length) break
    slots[i] = notaOf(key)
    i++
  }
  return slots
}

export function buildReuniaoUpdate(
  ev: EvaluatorResult | null,
  sp: SpinResult | null,
  fu: FollowupsResult | null,
  config: AiConfig | null,
) {
  const { optional } = resolveActiveCriteria(config, 'reuniao')
  const pesoOf = (key: string) => config?.criterios[key]?.peso ?? 3

  const nota_objecoes = ev?.quebra_objecoes?.nota ?? null
  const nota_spin = sp?.nota4?.media ?? null

  const scored: ScoredCriterion[] = []
  if (nota_objecoes != null) scored.push({ key: 'quebra_objecoes', nota: nota_objecoes, peso: pesoOf('quebra_objecoes') })
  if (nota_spin != null) scored.push({ key: 'spin_selling', nota: nota_spin, peso: pesoOf('spin_selling') })
  for (const def of optional) {
    const r = ev?.criterios_opcionais?.[def.key]
    if (r?.nota != null) scored.push({ key: def.key, nota: r.nota, peso: pesoOf(def.key) })
  }
  const nota_geral = weightedAverage(scored)

  const optionalKeys = optional.map(o => o.key)
  const slots = fillSlots(REUNIAO_OPTIONAL_ORDER, optionalKeys, key => ev?.criterios_opcionais?.[key]?.nota ?? null)

  const criterios_resultado: Record<string, unknown> = {}
  if (ev?.quebra_objecoes) {
    criterios_resultado.quebra_objecoes = {
      label: 'Quebra de Objeções', obrigatorio: true, peso: pesoOf('quebra_objecoes'),
      nota: ev.quebra_objecoes.nota, justificativa: ev.quebra_objecoes.justificativa,
      evidencias: ev.quebra_objecoes.evidencias, sugestoes: ev.quebra_objecoes.sugestoes,
      objecoes: ev.quebra_objecoes.objecoes,
    }
  }
  if (sp?.nota4) {
    criterios_resultado.spin_selling = {
      label: 'SPIN Selling', obrigatorio: true, peso: pesoOf('spin_selling'),
      nota: sp.nota4.media, S: sp.nota4.S, P: sp.nota4.P, I: sp.nota4.I, N: sp.nota4.N,
    }
  }
  for (const def of optional) {
    const r = ev?.criterios_opcionais?.[def.key]
    if (r) criterios_resultado[def.key] = { label: def.label, obrigatorio: false, peso: pesoOf(def.key), ...r }
  }

  const probMap: Record<string, number> = { alta: 75, media: 50, baixa: 25 }
  const probabilidade_fechamento = fu?.probabilidade_fechamento ? (probMap[fu.probabilidade_fechamento] ?? 50) : null

  return {
    nota_objecoes,
    nota_spin,
    nota_geral,
    nota_1: slots[0], nota_2: slots[1], nota_3: slots[2], nota_4: slots[3],
    criterios_resultado: Object.keys(criterios_resultado).length ? (criterios_resultado as unknown as Json) : null,
    probabilidade_fechamento,
    Spin: sp ? (sp as unknown as Json) : null,
    insights: ev?.insights ? (ev.insights as unknown as Json) : null,
    objecoes: ev?.quebra_objecoes?.objecoes?.length ? (ev.quebra_objecoes.objecoes as unknown as Json) : null,
    proposta: fu?.proposta_sugerida ? ({
      sugerida: fu.proposta_sugerida,
      interesses: fu.interesses_do_lead ?? [],
      dores: fu.dores_principais ?? [],
    } as unknown as Json) : null,
    follow_whatsapp_d1: fu?.whatsapp_d1 ?? null,
    follow_whatsapp_d3: fu?.whatsapp_d3 ?? null,
    follow_email_5: fu ? `${fu.email_d5.assunto}\n\n${fu.email_d5.corpo}` : null,
  }
}

export function buildLigacaoUpdate(
  lig: LigacaoResultV2 | null,
  fu: FollowupsResult | null,
  config: AiConfig | null,
) {
  const { optional } = resolveActiveCriteria(config, 'ligacao')
  const pesoOf = (key: string) => config?.criterios[key]?.peso ?? 3

  const nota_pedido_reuniao = lig?.pedido_reuniao?.nota ?? null
  const scored: ScoredCriterion[] = []
  if (nota_pedido_reuniao != null) scored.push({ key: 'pedido_reuniao', nota: nota_pedido_reuniao, peso: pesoOf('pedido_reuniao') })
  for (const def of optional) {
    const r = lig?.criterios_opcionais?.[def.key]
    if (r?.nota != null) scored.push({ key: def.key, nota: r.nota, peso: pesoOf(def.key) })
  }
  const nota_geral_vendedor = weightedAverage(scored)

  const optionalKeys = optional.map(o => o.key)
  const slots = fillSlots(LIGACAO_OPTIONAL_ORDER, optionalKeys, key => lig?.criterios_opcionais?.[key]?.nota ?? null)

  const criterios_resultado: Record<string, unknown> = {}
  if (lig?.pedido_reuniao) {
    criterios_resultado.pedido_reuniao = {
      label: 'Pedido de Reunião', obrigatorio: true, peso: pesoOf('pedido_reuniao'), ...lig.pedido_reuniao,
    }
  }
  for (const def of optional) {
    const r = lig?.criterios_opcionais?.[def.key]
    if (r) criterios_resultado[def.key] = { label: def.label, obrigatorio: false, peso: pesoOf(def.key), ...r }
  }

  const objecoesDisplay: ObjecaoAvaliada[] = (lig?.pedido_reuniao?.objecoes_recebidas ?? []).map((o, i) => ({
    numero: i + 1,
    texto: o.objecao,
    status: o.foi_bem_tratada ? 'quebrada' as const : 'nao_quebrada' as const,
    como_tratou: o.resposta_vendedor,
    sugestao_quebra: '',
  }))

  const insightsArr: string[] = [
    ...(lig?.analise_final?.top_3_pontos_fortes ?? []),
    ...(lig?.analise_final?.top_3_pontos_melhoria ?? []),
  ]

  const analise = lig
    ? ({ ...lig, metricas_gerais: { ...lig.metricas_gerais, nota_geral_vendedor: nota_geral_vendedor ?? lig.metricas_gerais.nota_geral_vendedor } } as unknown as Json)
    : null

  return {
    nota_pedido_reuniao,
    nota_geral: nota_geral_vendedor,
    nota_1: slots[0], nota_2: slots[1], nota_3: slots[2], nota_4: slots[3],
    criterios_resultado: Object.keys(criterios_resultado).length ? (criterios_resultado as unknown as Json) : null,
    analise,
    insights: insightsArr.length ? (insightsArr as unknown as Json) : null,
    objecoes: objecoesDisplay.length ? (objecoesDisplay as unknown as Json) : null,
    follow_whatsapp_d1: fu?.whatsapp_d1 ?? null,
    follow_whatsapp_d3: fu?.whatsapp_d3 ?? null,
    follow_email_5: fu ? `${fu.email_d5.assunto}\n\n${fu.email_d5.corpo}` : null,
  }
}
