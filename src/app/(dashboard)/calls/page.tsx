import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { CallsTable, type CallRow } from '@/components/dashboard/calls-table'

export default async function CallsPage() {
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

  const [{ data: raw }, { data: profiles }] = await Promise.all([
    service
      .from('ligacoes')
      .select('id, titulo, nota_geral, data_hora, duracao, status, vendedor_id')
      .eq('empresa_id', empresaId)
      .order('data_hora', { ascending: false }),
    service.from('profiles').select('id, nome').eq('empresa_id', empresaId),
  ])

  const profileMap: Record<string, string> = {}
  for (const p of profiles ?? []) profileMap[p.id] = p.nome

  const calls: CallRow[] = (raw ?? []).map(c => ({
    id:            c.id,
    titulo:        c.titulo,
    nota_geral:    c.nota_geral,
    data_hora:     c.data_hora,
    duracao:       c.duracao,
    status:        c.status,
    vendedor_nome: c.vendedor_id ? (profileMap[c.vendedor_id] ?? null) : null,
  }))

  const vendorNames = [...new Set(calls.map(c => c.vendedor_nome).filter(Boolean))] as string[]

  return <CallsTable calls={calls} vendorNames={vendorNames} />
}
