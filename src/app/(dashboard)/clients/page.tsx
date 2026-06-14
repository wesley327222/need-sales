import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { ClientsTable, type ClientRow } from '@/components/dashboard/clients-table'

const D = {
  accent: '#00E5A0', text1: '#F0F0F4', text2: '#8A8A96',
  mono: "'JetBrains Mono', monospace", ui: "'Space Grotesk', system-ui, sans-serif",
}

export default async function ClientsPage() {
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

  const [{ data: clientes }, { data: reunioes }, { data: ligacoes }] = await Promise.all([
    service
      .from('clientes')
      .select('id, nome, email, telefone, created_at')
      .eq('empresa_id', empresaId)
      .order('nome', { ascending: true }),
    service.from('reunioes').select('cliente_id, data_hora').eq('empresa_id', empresaId),
    service.from('ligacoes').select('cliente_id, data_hora').eq('empresa_id', empresaId),
  ])

  const rows: ClientRow[] = (clientes ?? []).map(c => {
    const meets = (reunioes ?? []).filter(r => r.cliente_id === c.id)
    const calls = (ligacoes ?? []).filter(l => l.cliente_id === c.id)

    const allDates = [
      ...meets.map(r => r.data_hora),
      ...calls.map(l => l.data_hora),
    ].filter(Boolean) as string[]

    allDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())

    return {
      id:               c.id,
      nome:             c.nome,
      email:            c.email,
      telefone:         c.telefone,
      created_at:       c.created_at,
      total_reunioes:   meets.length,
      total_ligacoes:   calls.length,
      ultima_interacao: allDates[0] ?? null,
    }
  })

  return (
    <div style={{ fontFamily: D.ui, color: D.text1 }}>
      <div style={{ padding: '28px 32px 0', marginBottom: 20 }}>
        <div style={{ fontFamily: D.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em', color: D.accent, marginBottom: 4 }}>Need Sales</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.04em', color: D.text1, margin: '0 0 3px' }}>Clientes</h1>
        <div style={{ fontSize: 12, color: D.text2 }}>Base de clientes e histórico de interações</div>
      </div>
      <div style={{ padding: '0 32px 40px' }}>
        <ClientsTable clients={rows} />
      </div>
    </div>
  )
}
