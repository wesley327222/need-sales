import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { VendorSidebar } from '@/components/vendor/sidebar'
import { BatchReportContent } from '@/components/vendor/batch-report-content'
import { V } from '@/components/vendor/colors'

export default async function BatchReportPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('nome, role').eq('id', user.id).single()
  const initials = (profile?.nome ?? 'V')
    .split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <VendorSidebar
        userName={profile?.nome ?? ''}
        userInitials={initials}
        userRole={profile?.role ?? 'seller'}
      />
      <main style={{ flex: 1, overflowY: 'auto', background: V.bg }}>
        <BatchReportContent loteId={id} />
      </main>
    </div>
  )
}
