import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { VendorSidebar } from '@/components/vendor/sidebar'
import { ActionCards } from '@/components/vendor/action-cards'
import { ScoreRing } from '@/components/vendor/score-ring'
import { V, scoreColor, fmtScore } from '@/components/vendor/colors'

export default async function VendorDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const service = createServiceClient()

  const { data: profile } = await service
    .from('profiles')
    .select('nome, role, empresa_id')
    .eq('id', user.id)
    .single()

  const initials = (profile?.nome ?? 'V').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  // My reunioes
  const { data: reunioes } = await service
    .from('reunioes')
    .select('id, titulo, cliente_id, nota_geral, data_hora, status')
    .eq('vendedor_id', user.id)
    .order('data_hora', { ascending: false })

  const scored = reunioes?.filter(m => m.nota_geral != null) ?? []
  const avgScore = scored.length
    ? scored.reduce((s, m) => s + (m.nota_geral ?? 0), 0) / scored.length
    : null

  const clientCount = new Set(reunioes?.map(m => m.cliente_id).filter(Boolean)).size

  // Follow-ups count: count reunioes with follow_whatsapp_d1
  const { count: followupCount } = await service
    .from('reunioes')
    .select('id', { count: 'exact', head: true })
    .eq('vendedor_id', user.id)
    .not('follow_whatsapp_d1', 'is', null)

  // Ranking: all sellers with their avg scores from reunioes
  const { data: rankingData } = await service
    .from('reunioes')
    .select('vendedor_id, nota_geral')
    .not('nota_geral', 'is', null)
    .not('vendedor_id', 'is', null)
    .eq('empresa_id', profile?.empresa_id ?? '')

  const { data: allSellers } = await service
    .from('profiles')
    .select('id, nome')
    .eq('empresa_id', profile?.empresa_id ?? '')

  type RankEntry = { id: string; name: string; score: number; count: number; me: boolean }
  const grouped: Record<string, { total: number; count: number }> = {}
  for (const m of rankingData ?? []) {
    if (!m.vendedor_id || m.nota_geral == null) continue
    if (!grouped[m.vendedor_id]) grouped[m.vendedor_id] = { total: 0, count: 0 }
    grouped[m.vendedor_id].total += m.nota_geral
    grouped[m.vendedor_id].count++
  }

  const ranking: RankEntry[] = (allSellers ?? [])
    .filter(s => grouped[s.id])
    .map(s => ({
      id: s.id,
      name: s.nome,
      score: grouped[s.id].total / grouped[s.id].count,
      count: grouped[s.id].count,
      me: s.id === user.id,
    }))
    .sort((a, b) => b.score - a.score)

  const myRankPos = ranking.findIndex(r => r.me) + 1

  // Criteria averages from inline columns
  const myReunioesScored = reunioes?.filter(m => m.nota_geral != null) ?? []
  const { data: reunioesDetail } = myReunioesScored.length
    ? await service
        .from('reunioes')
        .select('nota_escuta, nota_objecoes, nota_apresentacao')
        .eq('vendedor_id', user.id)
        .not('nota_geral', 'is', null)
    : { data: [] }

  function avg(arr: (number | null)[]): number | null {
    const vals = arr.filter((n): n is number => n != null)
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
  }

  const criAvg = {
    escuta:       avg((reunioesDetail ?? []).map(r => r.nota_escuta)),
    objecoes:     avg((reunioesDetail ?? []).map(r => r.nota_objecoes)),
    apresentacao: avg((reunioesDetail ?? []).map(r => r.nota_apresentacao)),
  }

  const sorted = Object.entries(criAvg).filter(([, v]) => v != null).sort(([, a], [, b]) => (a ?? 0) - (b ?? 0))
  const weakest = sorted[0]?.[0]

  const STATIC_ACTIONS = [
    {
      id: 1, priority: 'alta' as const,
      text: weakest === 'escuta'
        ? 'Pratique escuta ativa dedicando mais tempo a perguntas abertas e evitando interromper o cliente antes de ele concluir seu raciocínio.'
        : weakest === 'objecoes'
        ? 'Aprimore sua técnica de quebra de objeções. Use o método FEEL-FELT-FOUND ou reframing para converter resistências em oportunidades de venda.'
        : 'Conecte os benefícios do produto às dores específicas do cliente em vez de apresentar funcionalidades genéricas.',
      objetivo: weakest === 'escuta'
        ? 'Aumentar sua nota de Escuta Ativa e criar maior rapport com o cliente nas próximas reuniões.'
        : 'Converter mais objeções em fechamentos, aumentando sua taxa de conversão.',
    },
    {
      id: 2, priority: 'alta' as const,
      text: 'Durante as reuniões, aprofunde o uso do SPIN Selling — dedique mais tempo às perguntas de Implicação e Necessidade para criar maior senso de urgência no cliente.',
      objetivo: 'Aumentar sua nota SPIN Selling e tornar suas apresentações mais direcionadas às dores reais do cliente.',
    },
    {
      id: 3, priority: 'baixa' as const,
      text: 'Ao apresentar sua solução, conecte cada funcionalidade a uma dor específica mencionada pelo cliente. Evite falar de features genéricas e use casos de sucesso.',
      objetivo: 'Melhorar sua nota de Apresentação do Produto e aumentar a percepção de valor da solução.',
    },
  ]

  const firstName = profile?.nome?.split(' ')[0] ?? 'Vendedor'

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <VendorSidebar userName={profile?.nome ?? ''} userInitials={initials} userRole={profile?.role ?? 'seller'} />

      <main style={{ flex: 1, overflowY: 'auto', background: V.bg }}>
        <div style={{ padding: '28px 32px 0', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontFamily: V.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em', color: V.accent, marginBottom: 4 }}>Portal do Vendedor</div>
              <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.04em', marginBottom: 3 }}>Olá, {firstName}! 👋</h1>
              <div style={{ fontSize: 12, color: V.text2 }}>Aqui está o resumo da sua performance e atividades pendentes</div>
            </div>
          </div>
        </div>

        <div style={{ padding: '0 32px 40px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 14, marginBottom: 14 }}>
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 14 }}>
                {/* Minha Nota — with "A melhorar" badge */}
                <div style={{ background: V.surface, border: `1px solid ${V.border}`, borderRadius: 5, padding: '16px 20px' }}>
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    background: 'rgba(255,68,85,0.1)', border: '1px solid rgba(255,68,85,0.2)',
                    color: V.red, fontFamily: V.mono, fontSize: 8,
                    textTransform: 'uppercase', letterSpacing: '0.06em',
                    padding: '2px 6px', borderRadius: 2, marginBottom: 6,
                  }}>A melhorar</div>
                  <div style={{ fontFamily: V.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: V.text3, marginBottom: 8 }}>Minha Nota</div>
                  <div style={{ fontFamily: V.mono, fontSize: 28, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 5, color: avgScore != null ? scoreColor(avgScore) : V.text3 }}>{avgScore != null ? avgScore.toFixed(1) : '—'}</div>
                  <div style={{ fontSize: 10, color: V.text3 }}>Média geral</div>
                </div>
                {/* Other metric cards */}
                {[
                  { tag: 'Reuniões',       val: String(reunioes?.length ?? 0), sub: 'Este mês',   color: V.text1 },
                  { tag: 'Clientes Ativos', val: String(clientCount),           sub: 'Na carteira', color: V.text1 },
                  { tag: 'Follow-ups',      val: String(followupCount ?? 0),    sub: 'Pendentes',   color: V.text1 },
                ].map(card => (
                  <div key={card.tag} style={{ background: V.surface, border: `1px solid ${V.border}`, borderRadius: 5, padding: '16px 20px' }}>
                    <div style={{ marginBottom: 6, height: 18 }} />
                    <div style={{ fontFamily: V.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: V.text3, marginBottom: 8 }}>{card.tag}</div>
                    <div style={{ fontFamily: V.mono, fontSize: 28, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 5, color: card.color }}>{card.val}</div>
                    <div style={{ fontSize: 10, color: V.text3 }}>{card.sub}</div>
                  </div>
                ))}
              </div>
              <ActionCards actions={STATIC_ACTIONS} />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ background: V.surface, border: `1px solid ${V.border}`, borderRadius: 5, overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderBottom: `1px solid ${V.border}` }}>
                  <span style={{ fontFamily: V.mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: V.text2 }}>★ Ranking da Equipe</span>
                  {myRankPos > 0 && <span style={{ fontFamily: V.mono, fontSize: 9, color: V.accent }}>{myRankPos}º</span>}
                </div>
                <div style={{ padding: '8px 14px' }}>
                  {ranking.slice(0, 6).map((r, i) => {
                    const posColors = ['#F59E0B', V.text2, '#CD7F32']
                    const posColor = posColors[i] ?? V.text3
                    const pct = (r.score / 10) * 100
                    return (
                      <div key={r.id} style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0',
                        borderBottom: i < ranking.slice(0, 6).length - 1 ? `1px solid ${V.border}` : 'none',
                        ...(r.me ? { background: 'rgba(0,229,160,0.05)', margin: '0 -14px', padding: '9px 14px', borderLeft: `2px solid ${V.accent}` } : {}),
                      }}>
                        <span style={{ fontFamily: V.mono, fontSize: 11, fontWeight: 700, color: posColor, minWidth: 20 }}>{i + 1}</span>
                        <div style={{ width: 26, height: 26, borderRadius: '50%', background: r.me ? 'rgba(0,229,160,0.1)' : V.surface2, border: `1px solid ${r.me ? V.accent : V.border2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: V.accent, flexShrink: 0 }}>
                          {r.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: r.me ? V.accent : V.text1 }}>{r.name}</span>
                        <div style={{ width: 60 }}>
                          <div style={{ height: 2, background: V.border2, borderRadius: 1 }}>
                            <div style={{ width: `${pct}%`, height: 2, background: r.me ? V.accent : posColors[i] ?? V.text3, borderRadius: 1 }} />
                          </div>
                        </div>
                        <span style={{ fontFamily: V.mono, fontSize: 14, fontWeight: 700, letterSpacing: '-0.02em', color: scoreColor(r.score) }}>{r.score.toFixed(1)}</span>
                      </div>
                    )
                  })}
                  {ranking.length === 0 && (
                    <div style={{ padding: '12px 0', textAlign: 'center', fontFamily: V.mono, fontSize: 10, color: V.text3 }}>Sem dados de ranking ainda</div>
                  )}
                </div>
              </div>

              <div style={{ background: V.surface, border: `1px solid ${V.border}`, borderRadius: 5, overflow: 'hidden' }}>
                <div style={{ padding: '13px 16px', borderBottom: `1px solid ${V.border}` }}>
                  <span style={{ fontFamily: V.mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: V.text2 }}>Ações Rápidas</span>
                </div>
                <div style={{ padding: '10px 12px' }}>
                  {[
                    { href: '/vendor/meetings', label: 'Minhas Reuniões', sub: 'Ver e analisar reuniões', iconBg: 'rgba(0,229,160,0.08)' },
                    { href: '/vendor/clients',  label: 'Meus Clientes',   sub: 'Gerencie sua carteira',  iconBg: 'rgba(79,142,247,0.1)' },
                    { href: '/vendor/insights', label: 'Meus Insights',   sub: 'Analise e evolua',       iconBg: 'rgba(167,139,250,0.1)' },
                  ].map(qa => (
                    <a key={qa.href} href={qa.href} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: V.surface2, border: `1px solid ${V.border}`, borderRadius: 4, cursor: 'pointer', marginBottom: 8, textDecoration: 'none' }}>
                      <div style={{ width: 32, height: 32, borderRadius: 4, background: qa.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span style={{ color: V.accent }}>→</span>
                      </div>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: V.text1 }}>{qa.label}</div>
                        <div style={{ fontSize: 10, color: V.text3, marginTop: 1 }}>{qa.sub}</div>
                      </div>
                      <span style={{ marginLeft: 'auto', color: V.text3, fontSize: 14 }}>›</span>
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {reunioes && reunioes.length > 0 && (
            <div style={{ background: V.surface, border: `1px solid ${V.border}`, borderRadius: 5, overflow: 'hidden' }}>
              <div style={{ padding: '13px 16px', borderBottom: `1px solid ${V.border}` }}>
                <span style={{ fontFamily: V.mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: V.text2 }}>Últimas Reuniões</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Reunião', 'Data', 'Status', 'Nota', ''].map(h => (
                      <th key={h} style={{ fontFamily: V.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: V.text3, fontWeight: 500, textAlign: 'left', padding: '9px 16px', borderBottom: `1px solid ${V.border}` }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {reunioes.slice(0, 5).map(m => (
                    <tr key={m.id}>
                      <td style={{ padding: '12px 16px', borderBottom: `1px solid ${V.border}` }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: V.text1 }}>{m.titulo}</div>
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: `1px solid ${V.border}`, fontFamily: V.mono, fontSize: 12, color: V.text2 }}>
                        {m.data_hora ? new Date(m.data_hora).toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: `1px solid ${V.border}` }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 3, fontFamily: V.mono, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', background: m.status === 'processado' ? 'rgba(0,229,160,0.08)' : 'rgba(245,158,11,0.1)', color: m.status === 'processado' ? V.accent : V.amber, border: `1px solid ${m.status === 'processado' ? 'rgba(0,229,160,0.15)' : 'rgba(245,158,11,0.2)'}` }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
                          {m.status === 'processado' ? 'Analisada' : m.status === 'processing' ? 'Processando' : m.status}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: `1px solid ${V.border}` }}>
                        <ScoreRing score={m.nota_geral} size={42} />
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: `1px solid ${V.border}`, textAlign: 'right' }}>
                        <a href={`/vendor/meetings/${m.id}`} style={{ display: 'inline-flex', alignItems: 'center', padding: '5px 10px', borderRadius: 4, border: `1px solid ${V.border2}`, background: V.surface2, color: V.text2, fontSize: 10, fontFamily: V.ui, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                          Ver Detalhes
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
