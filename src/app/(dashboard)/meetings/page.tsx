import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { MeetingsTable, type MeetingRow } from '@/components/dashboard/meetings-table'

export default async function MeetingsPage() {
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

  const [{ data: raw }, { data: profiles }, { data: clientes }] = await Promise.all([
    service
      .from('reunioes')
      .select('id, titulo, nota_geral, data_hora, duracao, status, vendedor_id, cliente_id')
      .eq('empresa_id', empresaId)
      .order('data_hora', { ascending: false }),
    service.from('profiles').select('id, nome').eq('empresa_id', empresaId),
    service.from('clientes').select('id, nome').eq('empresa_id', empresaId),
  ])

  const profileMap: Record<string, string> = {}
  for (const p of profiles ?? []) profileMap[p.id] = p.nome

  const clienteMap: Record<string, string> = {}
  for (const c of clientes ?? []) clienteMap[c.id] = c.nome ?? ''

  const meetings: MeetingRow[] = (raw ?? []).map(m => ({
    id:            m.id,
    titulo:        m.titulo,
    nota_geral:    m.nota_geral,
    data_hora:     m.data_hora,
    duracao:       m.duracao,
    status:        m.status,
    cliente_nome:  m.cliente_id  ? (clienteMap[m.cliente_id]  ?? null) : null,
    vendedor_nome: m.vendedor_id ? (profileMap[m.vendedor_id] ?? null) : null,
  }))

  const vendorNames = [...new Set(meetings.map(m => m.vendedor_nome).filter(Boolean))] as string[]

  return <MeetingsTable meetings={meetings} vendorNames={vendorNames} />
}
