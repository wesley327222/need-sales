import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { data: callerProfile } = await service
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isManager = callerProfile && ['admin', 'manager'].includes(callerProfile.role)
  const isSelf = user.id === id

  if (!isManager && !isSelf) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 })

  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `avatars/${id}.${ext}`
  const buffer = await file.arrayBuffer()

  const { error: uploadError } = await service.storage
    .from('audio-files')
    .upload(path, buffer, { contentType: file.type, upsert: true })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const { data: signed } = await service.storage
    .from('audio-files')
    .createSignedUrl(path, 60 * 60 * 24 * 365)

  await service
    .from('profiles')
    .update({ avatar_url: path })
    .eq('id', id)

  return NextResponse.json({ path, signedUrl: signed?.signedUrl ?? null })
}
