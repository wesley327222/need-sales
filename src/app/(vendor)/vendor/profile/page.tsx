import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { VendorSidebar } from '@/components/vendor/sidebar'
import { VendorProfileForm } from './profile-form'

export default async function VendorProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const service = createServiceClient()
  const { data: profile } = await service
    .from('profiles')
    .select('id, nome, email, avatar_url, role')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/login')

  let avatarUrl: string | null = null
  if (profile.avatar_url?.startsWith('avatars/')) {
    const { data } = await service.storage
      .from('audio-files')
      .createSignedUrl(profile.avatar_url, 60 * 60 * 24 * 30)
    avatarUrl = data?.signedUrl ?? null
  } else {
    avatarUrl = profile.avatar_url ?? null
  }

  const initials = profile.nome.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0A0A0B' }}>
      <VendorSidebar userName={profile.nome} userInitials={initials} userRole="Vendedor" />
      <div style={{ flex: 1, padding: '32px 40px', overflowY: 'auto' }}>
        <VendorProfileForm
          id={profile.id}
          nome={profile.nome}
          email={profile.email}
          avatarUrl={avatarUrl}
        />
      </div>
    </div>
  )
}
