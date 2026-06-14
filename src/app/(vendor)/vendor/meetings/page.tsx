import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { VendorSidebar } from '@/components/vendor/sidebar'
import { MeetingsFilterTable } from '@/components/vendor/meetings-filter-table'
import { V } from '@/components/vendor/colors'

export default async function VendorMeetings() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const service = createServiceClient()

  const [{ data: profile }, { data: raw }, { data: rawClientes }] = await Promise.all([
    supabase.from('profiles').select('nome, role').eq('id', user.id).single(),
    service
      .from('reunioes')
      .select('id, titulo, nota_geral, data_hora, status, duracao, cliente_id')
      .eq('vendedor_id', user.id)
      .order('data_hora', { ascending: false }),
    service.from('clientes').select('id, nome'),
  ])

  const initials = (profile?.nome ?? 'V').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  const clienteMap: Record<string, string> = {}
  for (const c of rawClientes ?? []) clienteMap[c.id] = c.nome

  const reunioes = (raw ?? []).map(m => ({
    id:               m.id,
    titulo:           m.titulo,
    nota_geral:       m.nota_geral,
    data_hora:     m.data_hora,
    status:           m.status,
    duracao: m.duracao,
    clientes:         m.cliente_id ? { nome: clienteMap[m.cliente_id] ?? '' } : null,
  }))

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <VendorSidebar userName={profile?.nome ?? ''} userInitials={initials} userRole={profile?.role ?? 'seller'} />

      <main style={{ flex: 1, overflowY: 'auto', background: V.bg }}>
        <MeetingsFilterTable meetings={reunioes} />
      </main>
    </div>
  )
}
