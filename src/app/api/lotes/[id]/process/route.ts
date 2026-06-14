import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { runBatchLigacaoEvaluator, type CallInput } from '@/lib/agents/batch-ligacao-evaluator'
import { runWithRetry } from '@/lib/agents/pipeline'
import type { Json } from '@/lib/types/database'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()

  // Verify lote exists and is ready
  const { data: lote, error: loteError } = await supabase
    .from('ligacoes_lotes')
    .select('id, status, total_ligacoes, ligacoes_processadas')
    .eq('id', id)
    .single()

  if (loteError || !lote) {
    return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 })
  }
  if (lote.status === 'done') {
    return NextResponse.json({ message: 'Lote já processado' })
  }

  // Fetch all transcriptions from ligações in this batch
  const { data: ligacoes, error: ligError } = await supabase
    .from('ligacoes')
    .select('id, titulo, transcricao, nota_geral')
    .eq('lote_id', id)
    .not('transcricao', 'is', null)
    .order('created_at', { ascending: true })

  if (ligError || !ligacoes || ligacoes.length === 0) {
    await supabase.from('ligacoes_lotes').update({ status: 'error', updated_at: new Date().toISOString() }).eq('id', id)
    return NextResponse.json({ error: 'Nenhuma transcrição disponível' }, { status: 400 })
  }

  // Build inputs for Agent 2 (max 10)
  const calls: CallInput[] = ligacoes.slice(0, 10).map((l, i) => ({
    numero: i + 1,
    titulo: l.titulo,
    transcricao: l.transcricao!,
    nota_geral: l.nota_geral,
  }))

  // Run Agent 2 batch analysis
  const relatorio = await runWithRetry(
    () => runBatchLigacaoEvaluator(calls),
    'batch-ligacao-evaluator'
  )

  const status = relatorio ? 'done' : 'error'

  await supabase.from('ligacoes_lotes').update({
    status,
    relatorio: relatorio ? (relatorio as unknown as Json) : null,
    updated_at: new Date().toISOString(),
  }).eq('id', id)

  return NextResponse.json({ id, status, calls_analyzed: calls.length })
}
