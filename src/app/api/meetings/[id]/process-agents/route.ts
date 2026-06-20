import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { runWithRetry } from '@/lib/agents/pipeline'
import { runEvaluator } from '@/lib/agents/evaluator'
import { runSpin } from '@/lib/agents/spin'
import { runFollowups } from '@/lib/agents/followups'
import { runLigacaoEvaluator } from '@/lib/agents/ligacao-evaluator'
import { buildReuniaoUpdate, buildLigacaoUpdate } from '@/lib/agents/save-results'
import { fetchAiConfig, resolveActiveCriteria } from '@/lib/ai-config'
import type { EvaluatorResult, SpinResult, FollowupsResult, LigacaoResultV2 } from '@/lib/types/agents'

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
  const { optional } = resolveActiveCriteria(customConfig, 'reuniao')

  const [evalResult, spinResult, followupsResult] = await Promise.allSettled([
    runWithRetry<EvaluatorResult>(() => runEvaluator(transcricao, optional, customConfig), 'evaluator'),
    runWithRetry<SpinResult>(() => runSpin(transcricao), 'spin'),
    runWithRetry<FollowupsResult>(() => runFollowups(transcricao), 'followups'),
  ])

  const ev = evalResult.status === 'fulfilled' ? evalResult.value : null
  const sp = spinResult.status === 'fulfilled' ? spinResult.value : null
  const fu = followupsResult.status === 'fulfilled' ? followupsResult.value : null

  const status = ev || sp || fu ? (ev && sp && fu ? 'processado' : 'partial') : 'error'
  const updatePayload = buildReuniaoUpdate(ev, sp, fu, customConfig)

  await supabase.from('reunioes').update({
    status,
    ...updatePayload,
  }).eq('id', id)

  return NextResponse.json({ id, tipo: 'reuniao', status, nota_geral: updatePayload.nota_geral })
}

async function processLigacao(id: string, transcricao: string | null, contextoEmpresa?: string, loteId?: string, empresaId?: string) {
  const supabase = createServiceClient()

  if (!transcricao) {
    return NextResponse.json({ error: 'Transcrição não disponível' }, { status: 400 })
  }

  await supabase.from('ligacoes').update({ status: 'processing' }).eq('id', id)

  const customConfig = empresaId ? await fetchAiConfig(empresaId, 'ligacao') : null
  const { optional } = resolveActiveCriteria(customConfig, 'ligacao')

  const [ligResult, followupsResult] = await Promise.allSettled([
    runWithRetry<LigacaoResultV2>(() => runLigacaoEvaluator(transcricao, optional, contextoEmpresa, customConfig), 'ligacao-evaluator'),
    runWithRetry<FollowupsResult>(() => runFollowups(transcricao), 'followups'),
  ])

  const lig = ligResult.status === 'fulfilled' ? ligResult.value : null
  const fu  = followupsResult.status === 'fulfilled' ? followupsResult.value : null

  const status = lig || fu ? (lig && fu ? 'processado' : 'partial') : 'error'
  const updatePayload = buildLigacaoUpdate(lig, fu, customConfig)

  await supabase.from('ligacoes').update({
    status,
    ...updatePayload,
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

  return NextResponse.json({ id, tipo: 'ligacao', status, nota_geral: updatePayload.nota_geral })
}
