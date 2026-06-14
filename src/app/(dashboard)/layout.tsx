import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/layout/sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('nome, role')
    .eq('id', user.id)
    .single()

  const nome    = profile?.nome ?? 'Gestor'
  const initials = nome.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
  const role    = profile?.role ?? 'manager'

  return (
    <div style={{
      display: 'flex', height: '100vh', overflow: 'hidden',
      background: '#0A0A0B',
      fontFamily: "'Space Grotesk', system-ui, sans-serif",
      color: '#F0F0F4',
    }}>
      <Sidebar userName={nome} userInitials={initials} userRole={role} />
      <main style={{ flex: 1, overflowY: 'auto', background: '#0A0A0B' }}>
        {children}
      </main>
    </div>
  )
}
