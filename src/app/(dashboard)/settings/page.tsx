import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { SettingsClient, type TeamMember } from '@/components/dashboard/settings-client'

const D = {
  accent: '#00E5A0', text2: '#8A8A96',
  mono: "'JetBrains Mono', monospace", ui: "'Space Grotesk', system-ui, sans-serif",
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const service = createServiceClient()

  const { data: profile } = await service
    .from('profiles').select('id, nome, email, role, empresa_id, created_at').eq('id', user.id).single()

  const empresaId = profile?.empresa_id ?? null

  const [
    { data: company },
    { data: allProfiles },
    { data: reunioes },
    { data: ligacoes },
  ] = await Promise.all([
    empresaId
      ? service.from('companies').select('id, nome, cnpj, descricao, Produtos').eq('id', empresaId).single()
      : Promise.resolve({ data: null }),
    empresaId
      ? service.from('profiles').select('id, nome, email, role, created_at').eq('empresa_id', empresaId)
      : Promise.resolve({ data: [] }),
    empresaId
      ? service.from('reunioes').select('vendedor_id, nota_geral').eq('empresa_id', empresaId)
      : Promise.resolve({ data: [] }),
    empresaId
      ? service.from('ligacoes').select('vendedor_id').eq('empresa_id', empresaId)
      : Promise.resolve({ data: [] }),
  ])

  // Build team stats
  const reunioesMap: Record<string, { count: number; scores: number[] }> = {}
  for (const r of reunioes ?? []) {
    if (!r.vendedor_id) continue
    if (!reunioesMap[r.vendedor_id]) reunioesMap[r.vendedor_id] = { count: 0, scores: [] }
    reunioesMap[r.vendedor_id].count++
    if (r.nota_geral != null) reunioesMap[r.vendedor_id].scores.push(r.nota_geral)
  }
  const ligacoesMap: Record<string, number> = {}
  for (const l of ligacoes ?? []) {
    if (!l.vendedor_id) continue
    ligacoesMap[l.vendedor_id] = (ligacoesMap[l.vendedor_id] ?? 0) + 1
  }

  const team: TeamMember[] = (allProfiles ?? []).map(p => {
    const rStats = reunioesMap[p.id]
    const avgScore = rStats?.scores.length
      ? rStats.scores.reduce((a, b) => a + b, 0) / rStats.scores.length
      : null
    return {
      id:        p.id,
      nome:      p.nome,
      email:     p.email,
      role:      p.role,
      created_at: p.created_at,
      reunioes:  rStats?.count ?? 0,
      ligacoes:  ligacoesMap[p.id] ?? 0,
      avgScore,
    }
  })

  // Server actions
  async function saveProfile(formData: FormData) {
    'use server'
    const nome  = (formData.get('nome')  as string).trim()
    const email = (formData.get('email') as string).trim()
    if (!nome || !email) return
    const sb = createServiceClient()
    await sb.from('profiles').update({ nome, email, updated_at: new Date().toISOString() }).eq('id', user!.id)
    revalidatePath('/settings')
  }

  async function saveCompany(formData: FormData) {
    'use server'
    if (!empresaId) return
    const nome      = (formData.get('nome')      as string).trim()
    const cnpj      = (formData.get('cnpj')      as string).trim()
    const descricao = (formData.get('descricao') as string).trim()
    const produtos  = (formData.get('produtos')  as string).trim()
    const sb = createServiceClient()
    await sb.from('companies').update({
      nome,
      cnpj:       cnpj || null,
      descricao:  descricao || null,
      Produtos:   produtos || null,
      updated_at: new Date().toISOString(),
    }).eq('id', empresaId)
    revalidatePath('/settings')
  }

  return (
    <div style={{ fontFamily: D.ui, color: '#F0F0F4' }}>
      <div style={{ padding: '28px 32px 20px' }}>
        <div style={{ fontFamily: D.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em', color: D.accent, marginBottom: 4 }}>Need Sales</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.04em', margin: '0 0 3px' }}>Configurações</h1>
        <div style={{ fontSize: 12, color: D.text2 }}>Gerencie seu perfil, empresa e equipe</div>
      </div>

      <SettingsClient
        profile={profile ? {
          id:         profile.id,
          nome:       profile.nome,
          email:      profile.email,
          role:       profile.role,
          created_at: profile.created_at,
        } : null}
        company={company ? {
          id:       company.id,
          nome:     company.nome,
          descricao: company.descricao,
          Produtos: company.Produtos,
          cnpj:     company.cnpj,
        } : null}
        team={team}
        saveProfile={saveProfile}
        saveCompany={saveCompany}
      />
    </div>
  )
}
