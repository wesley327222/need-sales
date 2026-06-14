import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { runWithRetry } from '@/lib/agents/pipeline'
import { runEvaluator } from '@/lib/agents/evaluator'
import { runSpin } from '@/lib/agents/spin'
import { runFollowups } from '@/lib/agents/followups'
import { runLigacaoEvaluator } from '@/lib/agents/ligacao-evaluator'
import { fetchAiConfig } from '@/lib/ai-config'
import type { EvaluatorResult, SpinResult, FollowupsResult, LigacaoResultV2, ObjecaoAvaliada } from '@/lib/types/agents'
import type { Json } from '@/lib/types/database'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()

  // Try reunioes first, then ligacoes
  const { data: reuniao } = await supabase
    .from('reunioes')
    .select('id, transcricao, empresa_id')
    .eq('id', id)
    .single()

  if (reuniao) {
    return processReuniao(id, reuniao.transcricao, reuniao.empresa_id ?? undefined)
  }

  const { data: ligacao } = await supabase
    .from('ligacoes')
    .select('id, transcricao, empresa_id, lote_id')
    .eq('id', id)
    .single()

  if (ligacao) {
    // Fetch company context for richer analysis
    const { data: company } = ligacao.empresa_id
      ? await supabase.from('companies').select('nome, descricao, Produtos').eq('id', ligacao.empresa_id).single()
      : { data: null }
    const contextoEmpresa = company
      ? `Empresa: ${company.nome}${company.descricao ? `\nDescrição: ${company.descricao}` : ''}${company.Produtos ? `\nProdutos/Serviços: ${company.Produtos}` : ''}`
      : undefined
    return processLigacao(id, ligacao.transcricao, contextoEmpresa, ligacao.lote_id ?? undefined, ligacao.empresa_id ?? undefined)
  }

  return NextResponse.json({ error: 'Registro não encontrado' }, { status: 404 })
}

async function processReuniao(id: string, transcricao: string | null, empresaId?: string) {
  const supabase = createServiceClient()

  if (!transcricao) {
    return NextResponse.json({ error: 'Transcrição não disponível' }, { status: 400 })
  }

  await supabase.from('reunioes').update({ status: 'processing' }).eq('id', id)

  const customConfig = empresaId ? await fetchAiConfig(empresaId, 'reuniao') : null

  const [evalResult, spinResult, followupsResult] = await Promise.allSettled([
    runWithRetry<EvaluatorResult>(() => runEvaluator(transcricao, customConfig), 'evaluator'),
    runWithRetry<SpinResult>(() => runSpin(transcricao), 'spin'),
    runWithRetry<FollowupsResult>(() => runFollowups(transcricao), 'followups'),
  ])

  const ev = evalResult.status === 'fulfilled' ? evalResult.value : null
  const sp = spinResult.status === 'fulfilled' ? spinResult.value : null
  const fu = followupsResult.status === 'fulfilled' ? followupsResult.value : null

  const nota_escuta       = ev?.nota1?.valor ?? null
  const nota_objecoes     = ev?.nota2?.valor ?? null
  const nota_apresentacao = ev?.nota3?.valor ?? null
  const nota_spin         = sp?.nota4?.media ?? null

  const scores = [nota_escuta, nota_objecoes, nota_apresentacao].filter((n): n is number => n != null)
  const nota_geral = scores.length
    ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
    : null

  const probMap: Record<string, number> = { alta: 75, media: 50, baixa: 25 }
  const probabilidade_fechamento = fu?.probabilidade_fechamento
    ? (probMap[fu.probabilidade_fechamento] ?? 50)
    : null

  const status = ev || sp || fu ? (ev && sp && fu ? 'processado' : 'partial') : 'error'

  await supabase.from('reunioes').update({
    status,
    nota_escuta,
    nota_objecoes,
    nota_apresentacao,
    nota_geral,
    nota_spin,
    probabilidade_fechamento,
    Spin:            sp ? (sp as unknown as Json) : null,
    insights:        ev?.insights ? (ev.insights as unknown as Json) : null,
    objecoes:        ev?.nota2?.objecoes?.length ? (ev.nota2.objecoes as unknown as Json) : null,
    relatorio_nota_1: ev?.nota1 ? (ev.nota1 as unknown as Json) : null,
    relatorio_nota_2: ev?.nota2 ? (ev.nota2 as unknown as Json) : null,
    relatorio_nota_3: ev?.nota3 ? (ev.nota3 as unknown as Json) : null,
    proposta:         fu?.proposta_sugerida ? ({
      sugerida:    fu.proposta_sugerida,
      interesses:  fu.interesses_do_lead ?? [],
      dores:       fu.dores_principais ?? [],
    } as unknown as Json) : null,
    follow_whatsapp_d1: fu?.whatsapp_d1 ?? null,
    follow_whatsapp_d3: fu?.whatsapp_d3 ?? null,
    follow_email_5: fu ? `${fu.email_d5.assunto}\n\n${fu.email_d5.corpo}` : null,
  }).eq('id', id)

  return NextResponse.json({ id, tipo: 'reuniao', status, nota_geral })
}

async function processLigacao(id: string, transcricao: string | null, contextoEmpresa?: string, loteId?: string, empresaId?: string) {
  const supabase = createServiceClient()

  if (!transcricao) {
    return NextResponse.json({ error: 'Transcrição não disponível' }, { status: 400 })
  }

  await supabase.from('ligacoes').update({ status: 'processing' }).eq('id', id)

  const customConfig = empresaId ? await fetchAiConfig(empresaId, 'ligacao') : null

  const [ligResult, followupsResult] = await Promise.allSettled([
    runWithRetry<LigacaoResultV2>(() => runLigacaoEvaluator(transcricao, contextoEmpresa, customConfig), 'ligacao-evaluator'),
    runWithRetry<FollowupsResult>(() => runFollowups(transcricao), 'followups'),
  ])

  const lig = ligResult.status === 'fulfilled' ? ligResult.value : null
  const fu  = followupsResult.status === 'fulfilled' ? followupsResult.value : null

  const status = lig || fu ? (lig && fu ? 'processado' : 'partial') : 'error'

  // Map V2 fields to DB columns
  const pv = lig?.performance_vendedor
  const nota_acesso_decisor     = pv?.acesso_decisor?.nota ?? null
  const nota_qualificacao_lead  = pv?.explicacao_motivo?.nota ?? null   // criterion 2 = explicação motivo → reutiliza coluna
  const nota_geracao_curiosidade = pv?.geracao_curiosidade?.nota ?? null
  const nota_conducao_conversa  = pv?.conducao_conversa?.nota ?? null
  const nota_pedido_reuniao     = pv?.pedido_reuniao?.nota ?? null
  const nota_geral              = lig?.metricas_gerais?.nota_geral_vendedor ?? null

  // Normalize objeções to ObjecaoAvaliada format for the UI component
  const objecoesDisplay: ObjecaoAvaliada[] = (pv?.pedido_reuniao?.objecoes_recebidas ?? []).map((o, i) => ({
    numero: i + 1,
    texto: o.objecao,
    status: o.foi_bem_tratada ? 'quebrada' as const : 'nao_quebrada' as const,
    como_tratou: o.resposta_vendedor,
    sugestao_quebra: '',
  }))

  // Insights = pontos fortes + pontos de melhoria combined
  const insightsArr: string[] = [
    ...(lig?.analise_final?.top_3_pontos_fortes ?? []),
    ...(lig?.analise_final?.top_3_pontos_melhoria ?? []),
  ]

  await supabase.from('ligacoes').update({
    status,
    nota_acesso_decisor,
    nota_qualificacao_lead,
    nota_geracao_curiosidade,
    nota_conducao_conversa,
    nota_pedido_reuniao,
    nota_geral,
    analise:  lig ? (lig as unknown as Json) : null,
    insights: insightsArr.length ? (insightsArr as unknown as Json) : null,
    objecoes: objecoesDisplay.length ? (objecoesDisplay as unknown as Json) : null,
    follow_whatsapp_d1: fu?.whatsapp_d1 ?? null,
    follow_whatsapp_d3: fu?.whatsapp_d3 ?? null,
    follow_email_5: fu ? `${fu.email_d5.assunto}\n\n${fu.email_d5.corpo}` : null,
  }).eq('id', id)

  // If part of a batch: increment counter and auto-trigger Agent 2 when all done
  if (loteId) {
    const { data: lote } = await supabase
      .from('ligacoes_lotes')
      .select('total_ligacoes, ligacoes_processadas, status')
      .eq('id', loteId)
      .single()

    if (lote && lote.status !== 'done') {
      const novoCount = (lote.ligacoes_processadas ?? 0) + 1
      await supabase.from('ligacoes_lotes').update({
        ligacoes_processadas: novoCount,
      }).eq('id', loteId)

      if (novoCount >= lote.total_ligacoes) {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
        fetch(`${baseUrl}/api/lotes/${loteId}/process`, { method: 'POST' })
          .catch(err => console.error('[lote] batch process fire failed:', err))
      }
    }
  }

  return NextResponse.json({ id, tipo: 'ligacao', status, nota_geral })
}
