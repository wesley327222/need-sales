import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const service = createServiceClient()
  const { data: managerProfile } = await service
    .from('profiles')
    .select('role, empresa_id')
    .eq('id', user.id)
    .single()

  if (!managerProfile || !['admin', 'manager'].includes(managerProfile.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { nome, email, password } = await request.json()
  if (!nome || !email || !password) {
    return NextResponse.json({ error: 'nome, email e password são obrigatórios' }, { status: 400 })
  }

  const { data: newUser, error: authError } = await service.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })

  if (authError || !newUser.user) {
    return NextResponse.json({ error: authError?.message ?? 'Erro ao criar usuário' }, { status: 500 })
  }

  const { data: profile, error: profileError } = await service
    .from('profiles')
    .insert({
      id: newUser.user.id,
      nome,
      email,
      role: 'seller',
      empresa_id: managerProfile.empresa_id,
    })
    .select()
    .single()

  if (profileError) {
    await service.auth.admin.deleteUser(newUser.user.id)
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  return NextResponse.json(profile, { status: 201 })
}
