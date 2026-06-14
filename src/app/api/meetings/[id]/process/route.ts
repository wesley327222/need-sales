import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { openai } from '@/lib/openai'
import { toFile } from 'openai'
import { runWithRetry } from '@/lib/agents/pipeline'
import { runEvaluator } from '@/lib/agents/evaluator'
import { runSpin } from '@/lib/agents/spin'
import { runFollowups } from '@/lib/agents/followups'
import { runLigacaoEvaluator } from '@/lib/agents/ligacao-evaluator'
import { fetchAiConfig } from '@/lib/ai-config'
import type { EvaluatorResult, SpinResult, FollowupsResult, LigacaoResultV2, ObjecaoAvaliada } from '@/lib/types/agents'
import type { Json } from '@/lib/types/database'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const tipo = searchParams.get('tipo') ?? 'reuniao'

  const supabase = createServiceClient()
  const table = tipo === 'ligacao' ? 'ligacoes' : 'reunioes'

  const { data: record, error: recordError } = await supabase
    .from(table)
    .select('id, audio_url, status, empresa_id, audio_filename')
    .eq('id', id)
    .single()

  if (recordError || !record) {
    return NextResponse.json({ error: 'Registro não encontrado' }, { status: 404 })
  }
  if (!record.audio_url) {
    return NextResponse.json({ error: 'Nenhum arquivo de áudio associado' }, { status: 400 })
  }
  const force = searchParams.get('force') === '1'
  if (!force && record.status === 'processing') {
    return NextResponse.json({ error: 'Já em processamento pelos agentes de IA' }, { status: 409 })
  }

  // Mark as transcribing
  await supabase.from(table).update({ status: 'transcribing' }).eq('id', id)

  // Download audio from Storage
  const { data: urlData, error: urlError } = await supabase.storage
    .from('audio-files')
    .createSignedUrl(record.audio_url, 3600)

  if (urlError || !urlData?.signedUrl) {
    await supabase.from(table).update({ status: 'error' }).eq('id', id)
    return NextResponse.json({ error: 'Falha ao gerar URL assinada' }, { status: 500 })
  }

  let transcricaoText: string

  try {
    const audioRes = await fetch(urlData.signedUrl)
    if (!audioRes.ok) throw new Error(`Falha ao baixar áudio: ${audioRes.status}`)
    const audioBuffer = await audioRes.arrayBuffer()

    const filename = record.audio_filename ?? record.audio_url.split('/').pop() ?? 'audio.mp3'

    const transcription = await openai.audio.transcriptions.create({
      file: await toFile(Buffer.from(audioBuffer), filename, {
        type: audioRes.headers.get('content-type') ?? 'audio/mpeg',
      }),
      model: 'whisper-1',
      language: 'pt',
      response_format: 'text',
    })

    transcricaoText = typeof transcription === 'string'
      ? transcription
      : (transcription as { text: string }).text
  } catch (err) {
    console.error('[process] Whisper transcription error:', err)
    await supabase.from(table).update({ status: 'error' }).eq('id', id)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Erro na transcrição' },
      { status: 500 }
    )
  }

  // Save transcription and run agents synchronously
  await supabase.from(table).update({
    transcricao: transcricaoText,
    status: 'processing',
  }).eq('id', id)

  if (tipo === 'reuniao') {
    return runReuniaoAgents(id, transcricaoText, record.empresa_id ?? undefined)
  } else {
    let contextoEmpresa: string | undefined
    if (record.empresa_id) {
      const { data: company } = await supabase
        .from('companies')
        .select('nome, descricao, Produtos')
        .eq('id', record.empresa_id)
        .single()
      if (company) {
        contextoEmpresa = `Empresa: ${company.nome}${company.descricao ? `\nDescrição: ${company.descricao}` : ''}${company.Produtos ? `\nProdutos/Serviços: ${company.Produtos}` : ''}`
      }
    }

    // Get lote_id for batch tracking
    const { data: lig } = await supabase
      .from('ligacoes')
      .select('lote_id')
      .eq('id', id)
      .single()

    return runLigacaoAgents(id, transcricaoText, contextoEmpresa, lig?.lote_id ?? undefined, record.empresa_id ?? undefined)
  }
}

async function runReuniaoAgents(id: string, transcricao: string, empresaId?: string) {
  const supabase = createServiceClient()

  const customConfig = empresaId ? await fetchAiConfig(empresaId, 'reuniao') : null

  const [evalResult, spinResult, followupsResult] = await Promise.allSettled([
    runWithRetry<EvaluatorResult>(() => runEvaluator(transcricao, customConfig), 'evaluator'),
    runWithRetry<SpinResult>(() => runSpin(transcricao), 'spin'),
    runWithRetry<FollowupsResult>(() => runFollowups(transcricao), 'followups'),
  ])

  const ev = evalResult.status === 'fulfilled' ? evalResult.value : null
  const sp = spinResult.status === 'fulfilled' ? spinResult.value : null
  const fu = followupsResult.status === 'fulfilled' ? followupsResult.value : null

  const agentErrors: string[] = []
  if (!ev) agentErrors.push(`evaluator: ${evalResult.status === 'rejected' ? evalResult.reason : 'returned null'}`)
  if (!sp) agentErrors.push(`spin: ${spinResult.status === 'rejected' ? spinResult.reason : 'returned null'}`)
  if (!fu) agentErrors.push(`followups: ${followupsResult.status === 'rejected' ? followupsResult.reason : 'returned null'}`)
  if (agentErrors.length) console.error('[process] agent failures:', agentErrors)

  const nota_escuta       = ev?.nota1?.valor ?? null
  const nota_objecoes     = ev?.nota2?.valor ?? null
  const nota_apresentacao = ev?.nota3?.valor ?? null
  const nota_spin         = sp?.nota4?.media ?? null

  const scores = [nota_escuta, nota_objecoes, nota_apresentacao].filter((n): n is number => n != null)
  const nota_geral = scores.length
    ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
    : null

  // Map 'alta'/'media'/'baixa' → integer percentage
  const probMap: Record<string, number> = { alta: 75, media: 50, baixa: 25 }
  const probabilidade_fechamento = fu?.probabilidade_fechamento
    ? (probMap[fu.probabilidade_fechamento] ?? 50)
    : null

  const status = ev || sp || fu ? (ev && sp && fu ? 'processado' : 'partial') : 'error'

  const { error: saveErr } = await supabase.from('reunioes').update({
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

  if (saveErr) console.error('[process] Failed to save analysis:', saveErr.message)

  if (status === 'error') {
    return NextResponse.json(
      { error: 'Todos os agentes de IA falharam.', details: agentErrors },
      { status: 500 }
    )
  }

  return NextResponse.json({ id, tipo: 'reuniao', status, nota_geral })
}

async function runLigacaoAgents(id: string, transcricao: string, contextoEmpresa?: string, loteId?: string, empresaId?: string) {
  const supabase = createServiceClient()

  const customConfig = empresaId ? await fetchAiConfig(empresaId, 'ligacao') : null

  const [ligResult, followupsResult] = await Promise.allSettled([
    runWithRetry<LigacaoResultV2>(() => runLigacaoEvaluator(transcricao, contextoEmpresa, customConfig), 'ligacao-evaluator'),
    runWithRetry<FollowupsResult>(() => runFollowups(transcricao), 'followups'),
  ])

  const lig = ligResult.status === 'fulfilled' ? ligResult.value : null
  const fu  = followupsResult.status === 'fulfilled' ? followupsResult.value : null

  const status = lig || fu ? (lig && fu ? 'processado' : 'partial') : 'error'

  const pv = lig?.performance_vendedor
  const nota_acesso_decisor      = pv?.acesso_decisor?.nota ?? null
  const nota_qualificacao_lead   = pv?.explicacao_motivo?.nota ?? null
  const nota_geracao_curiosidade = pv?.geracao_curiosidade?.nota ?? null
  const nota_conducao_conversa   = pv?.conducao_conversa?.nota ?? null
  const nota_pedido_reuniao      = pv?.pedido_reuniao?.nota ?? null
  const nota_geral               = lig?.metricas_gerais?.nota_geral_vendedor ?? null

  const objecoesDisplay: ObjecaoAvaliada[] = (pv?.pedido_reuniao?.objecoes_recebidas ?? []).map((o, i) => ({
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
