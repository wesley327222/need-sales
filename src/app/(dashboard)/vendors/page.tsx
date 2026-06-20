import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { VendorsClient } from './vendors-client'
import { fetchAiConfig, resolveActiveCriteria } from '@/lib/ai-config'
import type { SellerRow } from '@/components/dashboard/vendors-table'

const D = {
  accent: '#00E5A0', amber: '#F59E0B', red: '#FF4455', blue: '#4F8EF7',
  text3: '#4A4A56',
}

function scoreColor(s: number | null | undefined) {
  if (s == null) return D.text3
  if (s >= 7.5) return D.accent
  if (s >= 6)   return D.amber
  return D.red
}

function avg(vals: (number | null)[]): number | null {
  const nums = vals.filter((v): v is number => v != null)
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : null
}

export default async function VendorsPage() {
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

  const [{ data: profiles }, { data: reunioes }, { data: ligacoes }, reuniaoConfig] = await Promise.all([
    service.from('profiles').select('id, nome, email, avatar_url')
      .eq('role', 'seller')
      .eq('empresa_id', empresaId),
    service.from('reunioes').select('vendedor_id, nota_geral, nota_escuta, nota_objecoes, nota_apresentacao, nota_1, nota_2, nota_3, nota_4, criterios_resultado')
      .eq('empresa_id', empresaId),
    service.from('ligacoes').select('vendedor_id, nota_geral')
      .eq('empresa_id', empresaId),
    fetchAiConfig(empresaId, 'reuniao'),
  ])

  const { optional: activeOptional } = resolveActiveCriteria(reuniaoConfig, 'reuniao')
  const criteriaLabels = activeOptional.map(c => c.label)

  const avatarUrlMap: Record<string, string | null> = {}
  for (const p of profiles ?? []) {
    if (p.avatar_url && p.avatar_url.startsWith('avatars/')) {
      const { data } = await service.storage
        .from('audio-files')
        .createSignedUrl(p.avatar_url, 60 * 60 * 24 * 30)
      avatarUrlMap[p.id] = data?.signedUrl ?? null
    } else {
      avatarUrlMap[p.id] = p.avatar_url ?? null
    }
  }

  const sellers: SellerRow[] = (profiles ?? []).map(p => {
    const meets = (reunioes ?? []).filter(r => r.vendedor_id === p.id)
    const calls  = (ligacoes ?? []).filter(l => l.vendedor_id === p.id)
    const allScores = [...meets.map(r => r.nota_geral), ...calls.map(c => c.nota_geral)]
    const legacyMeets = meets.filter(r => !r.criterios_resultado)
    const dynamicMeets = meets.filter(r => r.criterios_resultado)
    return {
      id: p.id,
      nome: p.nome,
      email: p.email,
      initials: p.nome.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2),
      avatarUrl: avatarUrlMap[p.id] ?? null,
      totalMeetings:   meets.length,
      totalCalls:      calls.length,
      avgScore:        avg(allScores),
      avgEscuta:       avg(legacyMeets.map(r => r.nota_escuta)),
      avgObjecoes:     avg(legacyMeets.map(r => r.nota_objecoes)),
      avgApresentacao: avg(legacyMeets.map(r => r.nota_apresentacao)),
      avgNota1:        avg(dynamicMeets.map(r => r.nota_1)),
      avgNota2:        avg(dynamicMeets.map(r => r.nota_2)),
      avgNota3:        avg(dynamicMeets.map(r => r.nota_3)),
      avgNota4:        avg(dynamicMeets.map(r => r.nota_4)),
    }
  }).sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0))

  const teamAvg = avg(sellers.map(s => s.avgScore))
  const totalAnalyses = (reunioes?.length ?? 0) + (ligacoes?.length ?? 0)

  const cards = [
    { label: 'Vendedores Ativos',    val: String(sellers.length),                              color: D.accent },
    { label: 'Nota Média da Equipe', val: teamAvg != null ? teamAvg.toFixed(1) + '/10' : '—', color: scoreColor(teamAvg) },
    { label: 'Total de Análises',    val: String(totalAnalyses),                               color: D.blue },
  ]

  return <VendorsClient sellers={sellers} cards={cards} criteriaLabels={criteriaLabels} />
}
