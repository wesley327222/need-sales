import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { VendorSidebar } from '@/components/vendor/sidebar'
import { InsightsChartLazy } from '@/components/vendor/chart-lazy'
import { V, scoreColor } from '@/components/vendor/colors'

const TRAININGS = [
  { badge: 'HOT',     badgeBg: 'rgba(255,68,85,0.15)',  badgeColor: '#FF4455', badgeBorder: 'rgba(255,68,85,0.25)',  title: 'Tratamento de Objeções de Preço',         desc: 'Técnicas avançadas para lidar com objeções relacionadas ao valor do produto.',    meta: '28 alunos' },
  { badge: 'EM ALTA', badgeBg: 'rgba(245,158,11,0.12)', badgeColor: '#F59E0B', badgeBorder: 'rgba(245,158,11,0.22)', title: 'Escuta Ativa e Comunicação',               desc: 'Habilidades de escuta e comunicação para melhorar o relacionamento com clientes.', meta: 'Acesso livre' },
  { badge: 'NOVO',    badgeBg: 'rgba(0,229,160,0.08)',  badgeColor: '#00E5A0', badgeBorder: 'rgba(0,229,160,0.18)',  title: 'Storytelling em Vendas',                   desc: 'Use o poder das histórias para criar apresentações mais envolventes.',              meta: 'Em breve' },
  { badge: 'NOVO',    badgeBg: 'rgba(0,229,160,0.08)',  badgeColor: '#00E5A0', badgeBorder: 'rgba(0,229,160,0.18)',  title: 'Técnicas de Fechamento',                   desc: 'Explore diferentes técnicas de fechamento para aumentar sua taxa de conversão.',   meta: '32 alunos' },
]

export default async function VendorInsights() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('nome, role, empresa_id').eq('id', user.id).single()
  const initials = (profile?.nome ?? 'V').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  // Reunioes from last 6 months (inline scores)
  const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
  const { data: reunioes } = await supabase
    .from('reunioes')
    .select('id, nota_geral, nota_escuta, nota_objecoes, nota_apresentacao, nota_spin, data_hora, status')
    .eq('vendedor_id', user.id)
    .gte('data_hora', sixMonthsAgo.toISOString())
    .order('data_hora')

  // Build monthly chart data from inline columns
  const monthMap: Record<string, { geral: number[]; objecoes: number[]; apresentacao: number[]; escuta: number[]; spin: number[] }> = {}

  for (const m of reunioes ?? []) {
    if (!m.data_hora) continue
    const label = new Date(m.data_hora).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
    if (!monthMap[label]) monthMap[label] = { geral: [], objecoes: [], apresentacao: [], escuta: [], spin: [] }
    if (m.nota_geral != null) monthMap[label].geral.push(m.nota_geral)
    if (m.nota_escuta != null) monthMap[label].escuta.push(m.nota_escuta)
    if (m.nota_objecoes != null) monthMap[label].objecoes.push(m.nota_objecoes)
    if (m.nota_apresentacao != null) monthMap[label].apresentacao.push(m.nota_apresentacao)
    if (m.nota_spin != null) monthMap[label].spin.push(m.nota_spin)
  }

  function avg(arr: number[]) { return arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : 0 }

  const labels = Object.keys(monthMap)
  const chartData = {
    labels,
    geral:        labels.map(l => avg(monthMap[l].geral)),
    objecoes:     labels.map(l => avg(monthMap[l].objecoes)),
    apresentacao: labels.map(l => avg(monthMap[l].apresentacao)),
    escuta:       labels.map(l => avg(monthMap[l].escuta)),
    spin:         labels.map(l => avg(monthMap[l].spin)),
  }

  function avgF(arr: (number | null)[]) {
    const vals = arr.filter((n): n is number => n != null)
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
  }

  const criAvg = {
    escuta:       avgF((reunioes ?? []).map(r => r.nota_escuta)),
    objecoes:     avgF((reunioes ?? []).map(r => r.nota_objecoes)),
    apresentacao: avgF((reunioes ?? []).map(r => r.nota_apresentacao)),
    spin:         avgF((reunioes ?? []).map(r => r.nota_spin ?? null)),
  }

  const scored = (reunioes ?? []).filter(m => m.nota_geral != null)
  const myAvg = scored.length ? scored.reduce((s, m) => s + (m.nota_geral ?? 0), 0) / scored.length : null

  const criteriaEntries = Object.entries(criAvg).filter(([, v]) => v != null) as [string, number][]
  const sorted = criteriaEntries.sort(([, a], [, b]) => a - b)
  const weakest  = sorted[0]
  const strongest = sorted[sorted.length - 1]

  const CRIT_LABELS: Record<string, string> = { escuta: 'Escuta Ativa', objecoes: 'Objeções', apresentacao: 'Apresentação', spin: 'SPIN Selling' }

  // Ranking position
  const { data: allRanking } = await supabase
    .from('reunioes')
    .select('vendedor_id, nota_geral')
    .not('nota_geral', 'is', null)
    .not('vendedor_id', 'is', null)
    .eq('empresa_id', profile?.empresa_id ?? '')

  const rankMap: Record<string, number[]> = {}
  for (const m of allRanking ?? []) {
    if (!m.vendedor_id) continue
    if (!rankMap[m.vendedor_id]) rankMap[m.vendedor_id] = []
    if (m.nota_geral != null) rankMap[m.vendedor_id].push(m.nota_geral)
  }
  const rankList = Object.entries(rankMap)
    .map(([id, scores]) => ({ id, avg: scores.reduce((a, b) => a + b, 0) / scores.length }))
    .sort((a, b) => b.avg - a.avg)
  const myPos = rankList.findIndex(r => r.id === user.id) + 1

  const METAS = [
    { title: 'Reuniões/Mês', sub: `${reunioes?.length ?? 0} este período`, pct: Math.min((reunioes?.length ?? 0) * 10, 100) },
    { title: 'Nota Geral',   sub: `${myAvg != null ? myAvg.toFixed(1) : '—'} de 9.0`, pct: myAvg ? Math.round((myAvg / 9) * 100) : 0 },
    { title: 'Top 3 Ranking', sub: `${myPos || '—'}º lugar`, pct: !myPos ? 0 : myPos === 1 ? 100 : myPos === 2 ? 70 : myPos === 3 ? 50 : 30 },
  ]

  const positivos = [
    criAvg.objecoes != null && criAvg.objecoes >= 7 && 'Forte capacidade de quebrar objeções — resultado acima da média do time.',
    criAvg.escuta != null && criAvg.escuta >= 7 && 'Demonstra boa escuta ativa, fazendo perguntas relevantes ao cliente.',
    criAvg.apresentacao != null && criAvg.apresentacao >= 7 && 'Apresenta o produto com clareza, conectando benefícios às dores do cliente.',
    criAvg.spin != null && criAvg.spin >= 7 && 'Aplica bem o SPIN Selling, explorando situação e problema do cliente.',
    myAvg != null && myAvg >= 7.5 && 'Nota geral acima de 7.5 — performance sólida de acordo com os critérios da empresa.',
  ].filter(Boolean) as string[]

  const melhorias = [
    criAvg.escuta != null && criAvg.escuta < 7.5 && `Escuta ativa abaixo de 7.5 (atual: ${criAvg.escuta.toFixed(1)}) — foque em fazer mais perguntas abertas.`,
    criAvg.objecoes != null && criAvg.objecoes < 7.5 && `Quebra de objeções abaixo de 7.5 (atual: ${criAvg.objecoes.toFixed(1)}) — pratique o método FEEL-FELT-FOUND.`,
    criAvg.spin != null && criAvg.spin < 7.5 && `SPIN Selling abaixo de 7.5 (atual: ${criAvg.spin.toFixed(1)}) — aprofunde as perguntas de Implicação e Necessidade.`,
  ].filter(Boolean) as string[]

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <VendorSidebar userName={profile?.nome ?? ''} userInitials={initials} userRole={profile?.role ?? 'seller'} />

      <main style={{ flex: 1, overflowY: 'auto', background: V.bg }}>
        <div style={{ padding: '28px 32px 0', marginBottom: 20 }}>
          <div style={{ fontFamily: V.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em', color: V.accent, marginBottom: 4 }}>Portal do Vendedor</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.04em', marginBottom: 3 }}>Meus Insights</h1>
          <div style={{ fontSize: 12, color: V.text2 }}>Análises e recomendações personalizadas para melhorar sua performance</div>
        </div>

        <div style={{ padding: '0 32px 40px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 14, marginBottom: 14 }}>
            <div style={{ background: V.surface, border: `1px solid ${V.border}`, borderRadius: 5, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 16px', borderBottom: `1px solid ${V.border}` }}>
                <span style={{ fontFamily: V.mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: V.text2 }}>▶ Minha Evolução por Critério</span>
              </div>
              <div style={{ padding: 16 }}>
                <div style={{ fontSize: 11, color: V.text2, marginBottom: 10, fontWeight: 600 }}>Evolução das Notas</div>
                {labels.length > 0 ? (
                  <InsightsChartLazy data={chartData} />
                ) : (
                  <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: V.text3, fontFamily: V.mono, fontSize: 10 }}>Dados insuficientes para o gráfico</div>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
                  {[['#00E5A0','Nota Geral'],['#4F8EF7','Objeções'],['#F59E0B','Apresentação'],['#A78BFA','Escuta'],['#F472B6','SPIN']].map(([c,l]) => (
                    <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: V.mono, fontSize: 9, color: V.text3 }}>
                      <span style={{ width: 12, height: 1.5, background: c, display: 'inline-block', borderRadius: 1 }} />{l}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ background: V.surface, border: `1px solid ${V.border}`, borderRadius: 5, overflow: 'hidden' }}>
                <div style={{ padding: '13px 16px', borderBottom: `1px solid ${V.border}` }}>
                  <span style={{ fontFamily: V.mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: V.text2 }}>🏆 Resumo do Período</span>
                </div>
                <div style={{ padding: '8px 14px' }}>
                  {[
                    ['Reuniões Realizadas', String(reunioes?.length ?? 0), V.text1],
                    ['Nota média geral', myAvg != null ? myAvg.toFixed(1) : '—', myAvg != null ? scoreColor(myAvg) : V.text3],
                    ['Melhor critério', strongest ? CRIT_LABELS[strongest[0]] : 'N/A', V.accent],
                    ['Foco de melhoria', weakest ? CRIT_LABELS[weakest[0]] : 'N/A', '#FF4455'],
                    ['Posição no ranking', myPos ? `${myPos}º lugar` : '—', V.text1],
                  ].map(([label, val, color]) => (
                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: `1px solid ${V.border}` }}>
                      <span style={{ fontSize: 12, color: V.text2 }}>{label}</span>
                      <span style={{ fontFamily: V.mono, fontWeight: 700, fontSize: 13, color }}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: V.surface, border: `1px solid ${V.border}`, borderRadius: 5, overflow: 'hidden' }}>
                <div style={{ padding: '13px 16px', borderBottom: `1px solid ${V.border}` }}>
                  <span style={{ fontFamily: V.mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: V.text2 }}>◎ Minhas Metas</span>
                </div>
                <div style={{ padding: '8px 14px' }}>
                  {METAS.map(m => (
                    <div key={m.title} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: `1px solid ${V.border}` }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: V.text1, marginBottom: 2 }}>{m.title}</div>
                        <div style={{ fontSize: 10, color: V.text3 }}>{m.sub}</div>
                      </div>
                      <div style={{ width: 80 }}>
                        <div style={{ height: 3, background: V.border2, borderRadius: 2 }}>
                          <div style={{ width: `${m.pct}%`, height: 3, background: V.accent, borderRadius: 2 }} />
                        </div>
                      </div>
                      <div style={{ fontFamily: V.mono, fontSize: 12, fontWeight: 700, color: m.pct >= 80 ? V.accent : m.pct >= 50 ? V.amber : '#FF4455' }}>{m.pct}%</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 260px', gap: 14 }}>
            <div style={{ background: V.surface, border: `1px solid ${V.border}`, borderRadius: 5, overflow: 'hidden' }}>
              <div style={{ padding: '13px 16px', borderBottom: `1px solid ${V.border}` }}>
                <span style={{ fontFamily: V.mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: V.text2 }}>✦ Insights da IA</span>
              </div>
              <div style={{ padding: '13px 16px' }}>
                <div style={{ fontFamily: V.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: V.accent, marginBottom: 8 }}>✓ Pontos Fortes</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 16 }}>
                  {(positivos.length > 0 ? positivos : ['Continue coletando dados de reuniões para gerar insights personalizados.']).map((t, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', borderRadius: 4, background: 'rgba(0,229,160,0.06)', border: '1px solid rgba(0,229,160,0.12)', fontSize: 12, lineHeight: 1.55, color: V.text1 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: V.accent, flexShrink: 0, marginTop: 4 }} />{t}
                    </div>
                  ))}
                </div>
                <div style={{ fontFamily: V.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: V.amber, marginBottom: 8 }}>⚑ Oportunidades de Melhoria</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(melhorias.length > 0 ? melhorias : ['Continue participando de reuniões para obter recomendações personalizadas.']).map((t, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 12px', borderRadius: 4, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.12)', fontSize: 12, lineHeight: 1.55, color: V.text1 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: V.amber, flexShrink: 0, marginTop: 4 }} />{t}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ background: V.surface, border: `1px solid ${V.border}`, borderRadius: 5, overflow: 'hidden' }}>
              <div style={{ padding: '13px 16px', borderBottom: `1px solid ${V.border}` }}>
                <span style={{ fontFamily: V.mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: V.text2 }}>🎓 Treinamentos Recomendados</span>
              </div>
              <div style={{ padding: '8px 14px' }}>
                {TRAININGS.map((t, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '11px 0', borderBottom: i < TRAININGS.length - 1 ? `1px solid ${V.border}` : 'none' }}>
                    <span style={{ fontFamily: V.mono, fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '2px 7px', borderRadius: 2, fontWeight: 700, flexShrink: 0, marginTop: 2, background: t.badgeBg, color: t.badgeColor, border: `1px solid ${t.badgeBorder}` }}>{t.badge}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: V.text1, marginBottom: 2 }}>{t.title}</div>
                      <div style={{ fontSize: 11, color: V.text3, marginBottom: 4, lineHeight: 1.4 }}>{t.desc}</div>
                      <div style={{ fontFamily: V.mono, fontSize: 9, color: V.text3 }}>{t.meta}</div>
                    </div>
                    <button style={{ padding: '5px 12px', borderRadius: 3, border: `1px solid ${V.border2}`, background: V.surface2, color: V.text2, fontSize: 10, fontFamily: V.ui, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
                      {t.meta === 'Em breve' ? 'Aguardar' : 'Iniciar'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
