import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { DashboardClient, type MeetingRow, type LigacaoRow, type SellerRow } from '@/components/dashboard/dashboard-client'
import { fetchAiConfig, resolveActiveCriteria } from '@/lib/ai-config'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const service = createServiceClient()

  const { data: managerProfile } = await service
    .from('profiles')
    .select('empresa_id')
    .eq('id', user.id)
    .single()

  if (!managerProfile?.empresa_id) redirect('/login')
  const empresaId = managerProfile.empresa_id

  const [{ data: rawMeetings }, { data: rawSellers }, { data: rawClientes }, { data: rawLigacoes }, reuniaoConfig, ligacaoConfig] = await Promise.all([
    service
      .from('reunioes')
      .select('id, titulo, nota_geral, nota_escuta, nota_objecoes, nota_apresentacao, nota_1, nota_2, nota_3, nota_4, criterios_resultado, data_hora, status, vendedor_id, cliente_id')
      .eq('empresa_id', empresaId)
      .order('data_hora', { ascending: false }),
    service.from('profiles').select('id, nome, role').eq('empresa_id', empresaId),
    service.from('clientes').select('id, nome').eq('empresa_id', empresaId),
    service
      .from('ligacoes')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false }),
    fetchAiConfig(empresaId, 'reuniao'),
    fetchAiConfig(empresaId, 'ligacao'),
  ])

  const reuniaoCriteriaLabels = resolveActiveCriteria(reuniaoConfig, 'reuniao').optional.map(c => c.label)
  const ligacaoCriteriaLabels = resolveActiveCriteria(ligacaoConfig, 'ligacao').optional.map(c => c.label)

  const clienteMap: Record<string, string> = {}
  for (const c of rawClientes ?? []) clienteMap[c.id] = c.nome

  const sellerNameMap: Record<string, string> = {}
  for (const s of rawSellers ?? []) sellerNameMap[s.id] = s.nome

  const meetings: MeetingRow[] = (rawMeetings ?? []).map(m => ({
    id:                  m.id,
    titulo:              m.titulo,
    nota_geral:          m.nota_geral,
    nota_escuta:         m.nota_escuta,
    nota_objecoes:       m.nota_objecoes,
    nota_apresentacao:   m.nota_apresentacao,
    nota_1:              m.nota_1,
    nota_2:              m.nota_2,
    nota_3:              m.nota_3,
    nota_4:              m.nota_4,
    criterios_resultado: m.criterios_resultado,
    data_hora:           m.data_hora,
    status:              m.status,
    vendedor_id:         m.vendedor_id,
    vendedor_nome:       m.vendedor_id ? (sellerNameMap[m.vendedor_id] ?? null) : null,
    cliente_nome:        m.cliente_id  ? (clienteMap[m.cliente_id]    ?? null) : null,
  }))

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ligacoes: LigacaoRow[] = ((rawLigacoes ?? []) as any[]).map(l => ({
    id:                       l.id,
    titulo:                   l.titulo,
    nota_geral:               l.nota_geral ?? null,
    nota_acesso_decisor:      l.nota_acesso_decisor ?? null,
    nota_geracao_curiosidade: l.nota_geracao_curiosidade ?? null,
    nota_conducao_conversa:   l.nota_conducao_conversa ?? null,
    nota_pedido_reuniao:      l.nota_pedido_reuniao ?? null,
    nota_1:                   l.nota_1 ?? null,
    nota_2:                   l.nota_2 ?? null,
    nota_3:                   l.nota_3 ?? null,
    nota_4:                   l.nota_4 ?? null,
    criterios_resultado:      l.criterios_resultado ?? null,
    data_hora:                l.data_hora ?? l.data_ligacao ?? null,
    status:                   l.status,
    vendedor_id:              l.vendedor_id ?? null,
    vendedor_nome:            l.vendedor_id ? (sellerNameMap[l.vendedor_id] ?? null) : null,
    cliente_nome:             l.cliente_id  ? (clienteMap[l.cliente_id]    ?? null) : null,
  }))

  const sellers: SellerRow[] = (rawSellers ?? []).map(s => ({
    id:   s.id,
    nome: s.nome,
    role: s.role,
  }))

  return (
    <DashboardClient
      meetings={meetings}
      ligacoes={ligacoes}
      sellers={sellers}
      reuniaoCriteriaLabels={reuniaoCriteriaLabels}
      ligacaoCriteriaLabels={ligacaoCriteriaLabels}
    />
  )
}
