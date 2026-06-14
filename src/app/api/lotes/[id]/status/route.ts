import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data: lote, error } = await supabase
    .from('ligacoes_lotes')
    .select('id, nome, status, total_ligacoes, ligacoes_processadas, relatorio, created_at')
    .eq('id', id)
    .single()

  if (error || !lote) return NextResponse.json({ error: 'Lote não encontrado' }, { status: 404 })

  // Count individual calls and their statuses
  const { data: ligacoes } = await supabase
    .from('ligacoes')
    .select('id, titulo, status, nota_geral, nota_acesso_decisor, nota_pedido_reuniao, nota_conducao_conversa')
    .eq('lote_id', id)
    .order('created_at', { ascending: true })

  return NextResponse.json({
    id: lote.id,
    nome: lote.nome,
    status: lote.status,
    total: lote.total_ligacoes,
    processadas: lote.ligacoes_processadas,
    pct: lote.total_ligacoes > 0
      ? Math.round((lote.ligacoes_processadas / lote.total_ligacoes) * 100)
      : 0,
    relatorio: lote.relatorio,
    ligacoes: ligacoes ?? [],
    created_at: lote.created_at,
  })
}
