import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { VendorSidebar } from '@/components/vendor/sidebar'
import { CallsFilterTable, type CallRow } from '@/components/vendor/calls-filter-table'
import { V } from '@/components/vendor/colors'

export default async function VendorCalls() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('nome, role').eq('id', user.id).single()
  const initials = (profile?.nome ?? 'V').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  // Ligações avulsas (sem pacote) — calls de um pacote aparecem só dentro do relatório do pacote
  const { data: ligacoes } = await supabase
    .from('ligacoes')
    .select('id, titulo, nota_geral, data_hora, status, duracao')
    .eq('vendedor_id', user.id)
    .is('lote_id', null)
    .order('data_hora', { ascending: false })

  // Pacotes (zip) — aparecem como um item só, com a nota geral do relatório consolidado
  const { data: lotes } = await supabase
    .from('ligacoes_lotes')
    .select('id, nome, status, total_ligacoes, relatorio, created_at')
    .eq('vendedor_id', user.id)
    .order('created_at', { ascending: false })

  const loteRows: CallRow[] = (lotes ?? []).map(l => {
    const rel = l.relatorio as { avaliacao?: { nota_geral?: number } } | null
    return {
      id: l.id,
      titulo: l.nome,
      nota_geral: rel?.avaliacao?.nota_geral ?? null,
      data_hora: l.created_at,
      status: l.status === 'done' ? 'processado' : l.status,
      duracao: null,
      isBatch: true,
      batchCount: l.total_ligacoes,
    }
  })

  const callRows: CallRow[] = (ligacoes ?? []).map(c => ({ ...c, isBatch: false }))

  const allRows = [...callRows, ...loteRows].sort((a, b) => {
    const da = a.data_hora ? new Date(a.data_hora).getTime() : 0
    const db = b.data_hora ? new Date(b.data_hora).getTime() : 0
    return db - da
  })

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <VendorSidebar userName={profile?.nome ?? ''} userInitials={initials} userRole={profile?.role ?? 'seller'} />

      <main style={{ flex: 1, overflowY: 'auto', background: V.bg }}>
        <CallsFilterTable calls={allRows} />
      </main>
    </div>
  )
}
