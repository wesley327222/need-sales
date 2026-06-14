import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { VendorSidebar } from '@/components/vendor/sidebar'
import { CallsFilterTable } from '@/components/vendor/calls-filter-table'
import { V } from '@/components/vendor/colors'

export default async function VendorCalls() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('nome, role').eq('id', user.id).single()
  const initials = (profile?.nome ?? 'V').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  const { data: ligacoes } = await supabase
    .from('ligacoes')
    .select('id, titulo, nota_geral, data_hora, status, duracao')
    .eq('vendedor_id', user.id)
    .order('data_hora', { ascending: false })

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <VendorSidebar userName={profile?.nome ?? ''} userInitials={initials} userRole={profile?.role ?? 'seller'} />

      <main style={{ flex: 1, overflowY: 'auto', background: V.bg }}>
        <CallsFilterTable calls={ligacoes ?? []} />
      </main>
    </div>
  )
}
