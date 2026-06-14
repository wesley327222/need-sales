import { redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const D = {
  bg: '#0A0A0B', surface: '#111113', surface2: '#18181B',
  border: '#1E1E22', border2: '#2A2A30',
  text1: '#F0F0F4', text2: '#8A8A96', text3: '#4A4A56',
  accent: '#00E5A0', amber: '#F59E0B', red: '#FF4455', blue: '#4F8EF7',
  mono: "'JetBrains Mono', monospace", ui: "'Space Grotesk', system-ui, sans-serif",
}

const MONTHS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function scoreColor(s: number | null): string {
  if (s == null) return D.text3
  if (s >= 7.5) return D.accent
  if (s >= 6)   return D.amber
  return D.red
}
function fmtScore(s: number | null): string { return s == null ? '—' : s.toFixed(1) }
function avg(arr: number[]): number | null {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color?: string }) {
  return (
    <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 5, padding: '18px 20px' }}>
      <div style={{ fontFamily: D.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: D.text3, marginBottom: 10 }}>{label}</div>
      <div style={{ fontFamily: D.mono, fontSize: 32, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 6, color: color ?? D.text1 }}>{value}</div>
      <div style={{ fontSize: 11, color: D.text3 }}>{sub}</div>
    </div>
  )
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{ fontFamily: D.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em', color: D.text3, marginBottom: 10, marginTop: 24 }}>{title}</div>
  )
}

export default async function ReportsPage() {
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

  const [{ data: reunioes }, { data: ligacoes }, { data: profiles }] = await Promise.all([
    service.from('reunioes').select('id, vendedor_id, data_hora, status, nota_geral, nota_escuta, nota_objecoes, nota_apresentacao, follow_whatsapp_d1, follow_whatsapp_d3, follow_email_5').eq('empresa_id', empresaId),
    service.from('ligacoes').select('id, vendedor_id, data_hora, status, nota_geral, nota_acesso_decisor, nota_qualificacao_lead, nota_geracao_curiosidade, nota_conducao_conversa, nota_pedido_reuniao, follow_whatsapp_d1').eq('empresa_id', empresaId),
    service.from('profiles').select('id, nome, role').eq('empresa_id', empresaId),
  ])

  const allR = reunioes ?? []
  const allL = ligacoes ?? []
  const allP = profiles ?? []

  // --- Totals ---
  const totalReunioes       = allR.length
  const totalLigacoes       = allL.length
  const reunioesAnalisadas  = allR.filter(r => r.status === 'processado').length
  const ligacoesAnalisadas  = allL.filter(l => l.status === 'processado').length
  const totalAnalisados     = reunioesAnalisadas + ligacoesAnalisadas
  const totalVendedores     = allP.filter(p => p.role === 'seller').length

  // Global avg
  const allScores = [
    ...allR.filter(r => r.nota_geral != null).map(r => r.nota_geral!),
    ...allL.filter(l => l.nota_geral != null).map(l => l.nota_geral!),
  ]
  const globalAvg = avg(allScores)

  // --- Vendor ranking ---
  type VendorBucket = { nome: string; reunioes: number; ligacoes: number; scores: number[] }
  const vendorMap: Record<string, VendorBucket> = {}

  const getNome = (id: string) => allP.find(p => p.id === id)?.nome ?? 'Desconhecido'

  for (const r of allR) {
    if (!r.vendedor_id) continue
    if (!vendorMap[r.vendedor_id]) vendorMap[r.vendedor_id] = { nome: getNome(r.vendedor_id), reunioes: 0, ligacoes: 0, scores: [] }
    vendorMap[r.vendedor_id].reunioes++
    if (r.nota_geral != null) vendorMap[r.vendedor_id].scores.push(r.nota_geral)
  }
  for (const l of allL) {
    if (!l.vendedor_id) continue
    if (!vendorMap[l.vendedor_id]) vendorMap[l.vendedor_id] = { nome: getNome(l.vendedor_id), reunioes: 0, ligacoes: 0, scores: [] }
    vendorMap[l.vendedor_id].ligacoes++
    if (l.nota_geral != null) vendorMap[l.vendedor_id].scores.push(l.nota_geral)
  }

  const vendorRanking = Object.entries(vendorMap)
    .map(([id, v]) => ({
      id,
      nome: v.nome,
      reunioes: v.reunioes,
      ligacoes: v.ligacoes,
      total: v.reunioes + v.ligacoes,
      avgScore: avg(v.scores),
      initials: v.nome.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2),
    }))
    .sort((a, b) => (b.avgScore ?? -1) - (a.avgScore ?? -1))

  // --- Monthly trend (last 6 months) ---
  const now = new Date()
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    return { year: d.getFullYear(), month: d.getMonth(), label: MONTHS[d.getMonth()] }
  })

  type MonthBucket = { reunioes: number; ligacoes: number; scores: number[] }
  const monthBuckets: MonthBucket[] = months.map(() => ({ reunioes: 0, ligacoes: 0, scores: [] }))

  for (const r of allR) {
    if (!r.data_hora) continue
    const d = new Date(r.data_hora)
    const idx = months.findIndex(m => m.year === d.getFullYear() && m.month === d.getMonth())
    if (idx === -1) continue
    monthBuckets[idx].reunioes++
    if (r.nota_geral != null) monthBuckets[idx].scores.push(r.nota_geral)
  }
  for (const l of allL) {
    if (!l.data_hora) continue
    const d = new Date(l.data_hora)
    const idx = months.findIndex(m => m.year === d.getFullYear() && m.month === d.getMonth())
    if (idx === -1) continue
    monthBuckets[idx].ligacoes++
    if (l.nota_geral != null) monthBuckets[idx].scores.push(l.nota_geral)
  }

  // --- Follow-ups ---
  const followWA1   = allR.filter(r => r.follow_whatsapp_d1).length + allL.filter(l => l.follow_whatsapp_d1).length
  const followWA3   = allR.filter(r => r.follow_whatsapp_d3).length
  const followEmail = allR.filter(r => r.follow_email_5).length
  const totalFollowups = followWA1 + followWA3 + followEmail

  // --- Score distribution ---
  const totalScored = allScores.length
  const hi  = allScores.filter(s => s >= 8).length
  const mid = allScores.filter(s => s >= 6 && s < 8).length
  const lo  = allScores.filter(s => s < 6).length

  // --- Criteria averages (reunioes only) ---
  const criteriaAvg = {
    escuta:       avg(allR.filter(r => r.nota_escuta != null).map(r => r.nota_escuta!)),
    objecoes:     avg(allR.filter(r => r.nota_objecoes != null).map(r => r.nota_objecoes!)),
    apresentacao: avg(allR.filter(r => r.nota_apresentacao != null).map(r => r.nota_apresentacao!)),
  }

  const tdSt: React.CSSProperties = {
    padding: '12px 16px', borderBottom: `1px solid ${D.border}`,
    fontFamily: D.mono, fontSize: 12, color: D.text2, verticalAlign: 'middle',
  }
  const thSt: React.CSSProperties = {
    fontFamily: D.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em',
    color: D.text3, fontWeight: 500, textAlign: 'left', padding: '10px 16px',
    borderBottom: `1px solid ${D.border}`,
  }

  return (
    <div style={{ fontFamily: D.ui, color: D.text1 }}>
      {/* Page header */}
      <div style={{ padding: '28px 32px 0', marginBottom: 20 }}>
        <div style={{ fontFamily: D.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em', color: D.accent, marginBottom: 4 }}>Need Sales</div>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.04em', color: D.text1, margin: '0 0 3px' }}>Relatórios</h1>
        <div style={{ fontSize: 12, color: D.text2 }}>Performance consolidada da equipe comercial</div>
      </div>

      <div style={{ padding: '0 32px 48px' }}>

        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginBottom: 4 }}>
          <StatCard label="Total Reuniões"   value={String(totalReunioes)}  sub={`${reunioesAnalisadas} analisadas`} />
          <StatCard label="Total Ligações"   value={String(totalLigacoes)}  sub={`${ligacoesAnalisadas} analisadas`} />
          <StatCard label="Analisados (IA)"  value={String(totalAnalisados)} sub="reuniões + ligações" color={D.accent} />
          <StatCard label="Vendedores"       value={String(totalVendedores)} sub="com gravações" />
          <StatCard label="Nota Média Geral" value={fmtScore(globalAvg)} sub="todas as gravações" color={scoreColor(globalAvg)} />
        </div>

        {/* Vendor ranking */}
        <SectionHeader title="Ranking de Vendedores" />
        {vendorRanking.length === 0 ? (
          <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 5, padding: '40px', textAlign: 'center', fontFamily: D.mono, fontSize: 10, color: D.text3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Nenhuma gravação analisada ainda
          </div>
        ) : (
          <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 5, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['#', 'Vendedor', 'Reuniões', 'Ligações', 'Total', 'Nota Média', 'Performance'].map(h => (
                    <th key={h} style={thSt}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vendorRanking.map((v, i) => (
                  <tr key={v.id}>
                    <td style={{ ...tdSt, color: D.text3, width: 36 }}>#{i + 1}</td>
                    <td style={{ ...tdSt, fontFamily: D.ui }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 30, height: 30, borderRadius: '50%', background: D.surface2, border: `1px solid ${D.border2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: D.accent, fontFamily: D.mono, flexShrink: 0 }}>
                          {v.initials}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: D.text1 }}>{v.nome}</span>
                      </div>
                    </td>
                    <td style={tdSt}>{v.reunioes}</td>
                    <td style={tdSt}>{v.ligacoes}</td>
                    <td style={tdSt}>{v.total}</td>
                    <td style={{ ...tdSt, fontFamily: D.mono, fontSize: 18, fontWeight: 700, color: scoreColor(v.avgScore) }}>
                      {fmtScore(v.avgScore)}
                    </td>
                    <td style={{ ...tdSt, minWidth: 120 }}>
                      {v.avgScore != null ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 4, background: D.border2, borderRadius: 2 }}>
                            <div style={{ width: `${(v.avgScore / 10) * 100}%`, height: 4, background: scoreColor(v.avgScore), borderRadius: 2 }} />
                          </div>
                          <span style={{ fontFamily: D.mono, fontSize: 9, color: D.text3, flexShrink: 0 }}>{((v.avgScore / 10) * 100).toFixed(0)}%</span>
                        </div>
                      ) : (
                        <span style={{ fontFamily: D.mono, fontSize: 10, color: D.text3 }}>Sem análise</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Monthly trend + criteria averages */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 10 }}>
          <div>
            <SectionHeader title="Atividade por Mês (últimos 6 meses)" />
            <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 5, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Mês', 'Reuniões', 'Ligações', 'Total', 'Nota Média'].map(h => (
                      <th key={h} style={thSt}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {months.map((m, i) => {
                    const b = monthBuckets[i]
                    const monthAvg = avg(b.scores)
                    const total = b.reunioes + b.ligacoes
                    return (
                      <tr key={m.label}>
                        <td style={{ ...tdSt, fontFamily: D.ui, color: D.text1, fontWeight: 600 }}>{m.label} {m.year}</td>
                        <td style={tdSt}>{b.reunioes || '—'}</td>
                        <td style={tdSt}>{b.ligacoes || '—'}</td>
                        <td style={{ ...tdSt, color: total > 0 ? D.text1 : D.text3 }}>{total || '—'}</td>
                        <td style={{ ...tdSt, fontFamily: D.mono, fontWeight: 700, color: scoreColor(monthAvg) }}>
                          {fmtScore(monthAvg)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <SectionHeader title="Critérios de Reunião" />
            <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 5, overflow: 'hidden' }}>
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { label: 'Escuta Ativa',  val: criteriaAvg.escuta },
                  { label: 'Objeções',       val: criteriaAvg.objecoes },
                  { label: 'Apresentação',   val: criteriaAvg.apresentacao },
                ].map(c => (
                  <div key={c.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                      <span style={{ fontSize: 12, color: D.text2 }}>{c.label}</span>
                      <span style={{ fontFamily: D.mono, fontSize: 15, fontWeight: 700, color: scoreColor(c.val) }}>{fmtScore(c.val)}</span>
                    </div>
                    <div style={{ height: 3, background: D.border2, borderRadius: 2 }}>
                      {c.val != null && <div style={{ width: `${(c.val / 10) * 100}%`, height: 3, background: scoreColor(c.val), borderRadius: 2 }} />}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <SectionHeader title="Distribuição de Notas" />
            <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 5, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {totalScored === 0 ? (
                <div style={{ fontFamily: D.mono, fontSize: 10, color: D.text3, textTransform: 'uppercase', textAlign: 'center', padding: '12px 0' }}>Sem dados</div>
              ) : [
                { label: '≥ 8.0 (Excelente)', count: hi,  pct: (hi / totalScored) * 100,  color: D.accent },
                { label: '6.0 – 7.9 (Bom)',   count: mid, pct: (mid / totalScored) * 100, color: D.amber },
                { label: '< 6.0 (Atenção)',    count: lo,  pct: (lo / totalScored) * 100,  color: D.red },
              ].map(row => (
                <div key={row.label}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: D.text2 }}>{row.label}</span>
                    <span style={{ fontFamily: D.mono, fontSize: 11, color: row.color }}>{row.count} ({row.pct.toFixed(0)}%)</span>
                  </div>
                  <div style={{ height: 3, background: D.border2, borderRadius: 2 }}>
                    <div style={{ width: `${row.pct}%`, height: 3, background: row.color, borderRadius: 2 }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Follow-ups */}
        <SectionHeader title="Follow-ups Gerados pela IA" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
          {[
            { label: 'Total Gerados',       value: String(totalFollowups),  sub: 'WA + Email',         color: D.accent },
            { label: 'WhatsApp D+1',         value: String(followWA1),       sub: 'primeiro contato' },
            { label: 'WhatsApp D+3',         value: String(followWA3),       sub: 'follow-up intermediário' },
            { label: 'Email D+5',            value: String(followEmail),     sub: 'proposta por email' },
          ].map(card => (
            <div key={card.label} style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 5, padding: '16px 18px' }}>
              <div style={{ fontFamily: D.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: D.text3, marginBottom: 8 }}>{card.label}</div>
              <div style={{ fontFamily: D.mono, fontSize: 28, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 5, color: card.color ?? D.text1 }}>{card.value}</div>
              <div style={{ fontSize: 11, color: D.text3 }}>{card.sub}</div>
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
