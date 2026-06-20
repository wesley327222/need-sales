'use client'

import { useState, useMemo } from 'react'
import { DashboardChart, type ChartDataset } from './dashboard-chart'

const D = {
  bg: '#0A0A0B', surface: '#111113', surface2: '#18181B',
  border: '#1E1E22', border2: '#2A2A30',
  text1: '#F0F0F4', text2: '#8A8A96', text3: '#4A4A56',
  accent: '#00E5A0', red: '#FF4455', amber: '#F59E0B', blue: '#4F8EF7',
  mono: "'JetBrains Mono', monospace", ui: "'Space Grotesk', system-ui, sans-serif",
}

function scoreColor(s: number | null | undefined): string {
  if (s == null) return D.text3
  if (s >= 7.5) return D.accent
  if (s >= 6)   return D.amber
  return D.red
}
function fmtScore(s: number | null | undefined): string {
  return s == null ? '—' : s.toFixed(1)
}
function avg(arr: (number | null | undefined)[]): number | null {
  const vals = arr.filter((n): n is number => n != null)
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
}

const MONTH_LABELS = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const SELLER_COLORS = ['#00E5A0','#4F8EF7','#A78BFA','#F59E0B','#FF4455','#00D4FF','#FF8C00']

type DatePreset = '' | 'hoje' | 'ontem' | '7dias' | 'estemes' | 'mespassado' | 'personalizado'

const PRESETS: { key: DatePreset; label: string }[] = [
  { key: '',           label: 'Todos'      },
  { key: 'hoje',       label: 'Hoje'       },
  { key: 'ontem',      label: 'Ontem'      },
  { key: '7dias',      label: '7 dias'     },
  { key: 'estemes',    label: 'Este mês'   },
  { key: 'mespassado', label: 'Mês passado'},
  { key: 'personalizado', label: 'Personalizado' },
]

export interface MeetingRow {
  id: string
  titulo: string
  nota_geral: number | null
  nota_escuta: number | null
  nota_objecoes: number | null
  nota_apresentacao: number | null
  nota_1: number | null
  nota_2: number | null
  nota_3: number | null
  nota_4: number | null
  criterios_resultado: unknown
  data_hora: string | null
  status: string | null
  vendedor_id: string | null
  vendedor_nome: string | null
  cliente_nome: string | null
}

export interface LigacaoRow {
  id: string
  titulo: string
  nota_geral: number | null
  nota_acesso_decisor: number | null
  nota_geracao_curiosidade: number | null
  nota_conducao_conversa: number | null
  nota_pedido_reuniao: number | null
  nota_1: number | null
  nota_2: number | null
  nota_3: number | null
  nota_4: number | null
  criterios_resultado: unknown
  data_hora: string | null
  status: string | null
  vendedor_id: string | null
  vendedor_nome: string | null
  cliente_nome: string | null
}

export interface SellerRow {
  id: string
  nome: string
  role: string
}

type BaseRow = Pick<MeetingRow, 'id'|'titulo'|'nota_geral'|'data_hora'|'status'|'vendedor_id'|'vendedor_nome'|'cliente_nome'>

interface Props {
  meetings: MeetingRow[]
  ligacoes: LigacaoRow[]
  sellers: SellerRow[]
  reuniaoCriteriaLabels?: string[]
  ligacaoCriteriaLabels?: string[]
}

function filterByDate<T extends { data_hora: string | null }>(rows: T[], from: string, to: string): T[] {
  if (!from && !to) return rows
  return rows.filter(r => {
    if (!r.data_hora) return false
    const d = r.data_hora.slice(0, 10)
    if (from && d < from) return false
    if (to   && d > to)   return false
    return true
  })
}

function computePresetRange(preset: DatePreset, customFrom: string, customTo: string): { from: string; to: string } {
  if (preset === '' ) return { from: '', to: '' }
  if (preset === 'personalizado') return { from: customFrom, to: customTo }
  const now = new Date()
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  const today = fmt(now)
  switch (preset) {
    case 'hoje':       return { from: today, to: today }
    case 'ontem': {
      const d = fmt(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1))
      return { from: d, to: d }
    }
    case '7dias':
      return { from: fmt(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6)), to: today }
    case 'estemes':
      return { from: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), to: today }
    case 'mespassado': {
      const from = fmt(new Date(now.getFullYear(), now.getMonth() - 1, 1))
      const to   = fmt(new Date(now.getFullYear(), now.getMonth(), 0))
      return { from, to }
    }
    default: return { from: '', to: '' }
  }
}

function computeTopSellers(scored: BaseRow[]): { id: string; name: string; score: number; count: number; initials: string }[] {
  const map: Record<string, { total: number; count: number; name: string }> = {}
  for (const m of scored) {
    if (!m.vendedor_id || m.nota_geral == null) continue
    if (!map[m.vendedor_id]) map[m.vendedor_id] = { total: 0, count: 0, name: m.vendedor_nome ?? 'Desconhecido' }
    map[m.vendedor_id].total += m.nota_geral
    map[m.vendedor_id].count++
  }
  return Object.entries(map)
    .map(([id, v]) => ({
      id, name: v.name, score: v.total / v.count, count: v.count,
      initials: v.name.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
}

function defaultMonths() {
  const now = new Date()
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
    return { year: d.getFullYear(), month: d.getMonth(), label: MONTH_LABELS[d.getMonth()] }
  })
}

export function DashboardClient({ meetings, ligacoes, sellers, reuniaoCriteriaLabels = [], ligacaoCriteriaLabels = [] }: Props) {
  const [tipo, setTipo] = useState<'reuniao' | 'ligacao'>('reuniao')
  const [preset, setPreset] = useState<DatePreset>('')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo,   setCustomTo]   = useState('')
  const [chartMode, setChartMode]   = useState<'criterios' | 'vendedores'>('criterios')

  const { from: dateFrom, to: dateTo } = useMemo(
    () => computePresetRange(preset, customFrom, customTo),
    [preset, customFrom, customTo],
  )

  const filteredMeetings = useMemo(() => filterByDate(meetings, dateFrom, dateTo), [meetings, dateFrom, dateTo])
  const filteredLigacoes = useMemo(() => filterByDate(ligacoes, dateFrom, dateTo), [ligacoes, dateFrom, dateTo])

  const filtered: BaseRow[] = tipo === 'reuniao' ? filteredMeetings : filteredLigacoes
  const scored   = filtered.filter(r => r.nota_geral != null)
  const avgScore = avg(scored.map(r => r.nota_geral))

  // Criteria averages panel — Nota Geral sempre inclui todos os registros; os demais
  // separam legado (colunas fixas) de dinâmico (nota_1..nota_4, conforme config atual)
  const criteriaAvg: Record<string, number | null> = tipo === 'reuniao'
    ? (() => {
        const legacy = filteredMeetings.filter(m => !m.criterios_resultado)
        const dynamic = filteredMeetings.filter(m => m.criterios_resultado)
        const entries: Record<string, number | null> = { 'Nota Geral': avg(filteredMeetings.map(m => m.nota_geral)) }
        entries['Escuta Ativa'] = avg(legacy.map(m => m.nota_escuta))
        entries['Objeções'] = avg(filteredMeetings.map(m => m.nota_objecoes))
        entries['Apresentação'] = avg(legacy.map(m => m.nota_apresentacao))
        const slots = ['nota_1', 'nota_2', 'nota_3', 'nota_4'] as const
        reuniaoCriteriaLabels.slice(0, 4).forEach((label, i) => {
          entries[label] = avg(dynamic.map(m => m[slots[i]]))
        })
        return entries
      })()
    : (() => {
        const legacy = filteredLigacoes.filter(l => !l.criterios_resultado)
        const dynamic = filteredLigacoes.filter(l => l.criterios_resultado)
        const entries: Record<string, number | null> = { 'Nota Geral': avg(filteredLigacoes.map(l => l.nota_geral)) }
        entries['Pedido de Reunião'] = avg(filteredLigacoes.map(l => l.nota_pedido_reuniao))
        entries['Acesso Decisor'] = avg(legacy.map(l => l.nota_acesso_decisor))
        entries['Curiosidade'] = avg(legacy.map(l => l.nota_geracao_curiosidade))
        entries['Condução'] = avg(legacy.map(l => l.nota_conducao_conversa))
        const slots = ['nota_1', 'nota_2', 'nota_3', 'nota_4'] as const
        ligacaoCriteriaLabels.slice(0, 4).forEach((label, i) => {
          entries[label] = avg(dynamic.map(l => l[slots[i]]))
        })
        return entries
      })()

  const topSellers = useMemo(() => computeTopSellers(scored), [scored])

  // Chart months
  const chartMonths = useMemo(() => {
    if (dateFrom || dateTo) {
      const fromD = dateFrom ? new Date(dateFrom + 'T00:00:00') : (() => {
        const ts = filtered.filter(r => r.data_hora).map(r => new Date(r.data_hora!).getTime())
        return ts.length ? new Date(Math.min(...ts)) : new Date()
      })()
      const toD = dateTo ? new Date(dateTo + 'T23:59:59') : new Date()
      const months: { year: number; month: number; label: string }[] = []
      let cur = new Date(fromD.getFullYear(), fromD.getMonth(), 1)
      while (cur <= toD && months.length < 12) {
        months.push({ year: cur.getFullYear(), month: cur.getMonth(), label: `${MONTH_LABELS[cur.getMonth()]}/${String(cur.getFullYear()).slice(2)}` })
        cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1)
      }
      return months.length > 0 ? months : defaultMonths()
    }
    return defaultMonths()
  }, [dateFrom, dateTo, filtered])

  // Chart datasets
  const chartData = useMemo(() => {
    const mAvg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0
    const sellerBuckets: Record<string, number[][]> = {}

    if (tipo === 'reuniao') {
      type B = { geral: number[]; escuta: number[]; objecoes: number[]; apresentacao: number[] }
      const buckets: B[] = chartMonths.map(() => ({ geral: [], escuta: [], objecoes: [], apresentacao: [] }))
      for (const m of filteredMeetings) {
        if (!m.data_hora) continue
        const d = new Date(m.data_hora)
        const idx = chartMonths.findIndex(mo => mo.year === d.getFullYear() && mo.month === d.getMonth())
        if (idx === -1) continue
        if (m.nota_geral        != null) buckets[idx].geral.push(m.nota_geral)
        if (m.nota_escuta       != null) buckets[idx].escuta.push(m.nota_escuta)
        if (m.nota_objecoes     != null) buckets[idx].objecoes.push(m.nota_objecoes)
        if (m.nota_apresentacao != null) buckets[idx].apresentacao.push(m.nota_apresentacao)
        if (m.vendedor_id && m.nota_geral != null) {
          if (!sellerBuckets[m.vendedor_id]) sellerBuckets[m.vendedor_id] = chartMonths.map(() => [])
          sellerBuckets[m.vendedor_id][idx].push(m.nota_geral)
        }
      }
      const criteriosDatasets: ChartDataset[] = [
        { label: 'Nota Geral',   data: buckets.map(b => mAvg(b.geral)),        color: '#00E5A0', dashed: false },
        { label: 'Escuta Ativa', data: buckets.map(b => mAvg(b.escuta)),       color: '#A78BFA', dashed: true  },
        { label: 'Objeções',     data: buckets.map(b => mAvg(b.objecoes)),     color: '#4F8EF7', dashed: true  },
        { label: 'Apresentação', data: buckets.map(b => mAvg(b.apresentacao)), color: '#F59E0B', dashed: true  },
      ]
      return buildVendedoresAndReturn(criteriosDatasets, sellerBuckets, mAvg)
    } else {
      type B = { geral: number[]; acesso: number[]; curiosidade: number[]; conducao: number[] }
      const buckets: B[] = chartMonths.map(() => ({ geral: [], acesso: [], curiosidade: [], conducao: [] }))
      for (const l of filteredLigacoes) {
        if (!l.data_hora) continue
        const d = new Date(l.data_hora)
        const idx = chartMonths.findIndex(mo => mo.year === d.getFullYear() && mo.month === d.getMonth())
        if (idx === -1) continue
        if (l.nota_geral              != null) buckets[idx].geral.push(l.nota_geral)
        if (l.nota_acesso_decisor     != null) buckets[idx].acesso.push(l.nota_acesso_decisor)
        if (l.nota_geracao_curiosidade!= null) buckets[idx].curiosidade.push(l.nota_geracao_curiosidade)
        if (l.nota_conducao_conversa  != null) buckets[idx].conducao.push(l.nota_conducao_conversa)
        if (l.vendedor_id && l.nota_geral != null) {
          if (!sellerBuckets[l.vendedor_id]) sellerBuckets[l.vendedor_id] = chartMonths.map(() => [])
          sellerBuckets[l.vendedor_id][idx].push(l.nota_geral)
        }
      }
      const criteriosDatasets: ChartDataset[] = [
        { label: 'Nota Geral',     data: buckets.map(b => mAvg(b.geral)),        color: '#00E5A0', dashed: false },
        { label: 'Acesso Decisor', data: buckets.map(b => mAvg(b.acesso)),       color: '#A78BFA', dashed: true  },
        { label: 'Curiosidade',    data: buckets.map(b => mAvg(b.curiosidade)),  color: '#4F8EF7', dashed: true  },
        { label: 'Condução',       data: buckets.map(b => mAvg(b.conducao)),     color: '#F59E0B', dashed: true  },
      ]
      return buildVendedoresAndReturn(criteriosDatasets, sellerBuckets, mAvg)
    }

    function buildVendedoresAndReturn(
      criteriosDatasets: ChartDataset[],
      sellerBuckets: Record<string, number[][]>,
      mAvg: (arr: number[]) => number,
    ) {
      let anonCount = 0
      const sellersByCount = Object.entries(sellerBuckets)
        .map(([id, bkts]) => {
          const found = sellers.find(s => s.id === id)?.nome
          const name = found ?? (() => { anonCount++; return `Anônimo ${anonCount}` })()
          return { id, total: bkts.flat().length, name }
        })
        .sort((a, b) => b.total - a.total)
        .slice(0, 6)
      const vendedoresDatasets: ChartDataset[] = sellersByCount.map(({ id, name }, i) => ({
        label: name,
        data: sellerBuckets[id].map(arr => mAvg(arr)),
        color: SELLER_COLORS[i % SELLER_COLORS.length],
        dashed: false,
      }))
      return { criteriosDatasets, vendedoresDatasets }
    }
  }, [tipo, filteredMeetings, filteredLigacoes, chartMonths, sellers])

  const chartDatasets = chartMode === 'criterios' ? chartData.criteriosDatasets : chartData.vendedoresDatasets
  const chartLabels   = chartMonths.map(m => m.label)
  const hasFilter     = preset !== ''
  const recentRecords = filtered.slice(0, 4)
  const recordLabel   = tipo === 'reuniao' ? 'Reuniões' : 'Ligações'
  const recordPath    = tipo === 'reuniao' ? '/meetings' : '/calls'
  const recordDetail  = (id: string) => tipo === 'reuniao' ? `/meetings/${id}` : `/calls/${id}`

  const dateSt: React.CSSProperties = {
    padding: '6px 9px', borderRadius: 4,
    border: `1px solid ${D.border2}`, background: D.surface2,
    color: D.text2, fontSize: 11, fontFamily: D.ui,
    outline: 'none', colorScheme: 'dark' as React.CSSProperties['colorScheme'],
  }

  return (
    <div style={{ fontFamily: D.ui, color: D.text1 }}>

      {/* ── Header ──────────────────────────────────────────────── */}
      <div style={{ padding: '28px 32px 0', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>

          {/* Title + tipo toggle */}
          <div>
            <div style={{ fontFamily: D.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em', color: D.accent, marginBottom: 4 }}>Need Sales</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.04em', color: D.text1, margin: 0 }}>Dashboard</h1>
              {/* Tipo toggle */}
              <div style={{ display: 'flex', background: D.surface2, border: `1px solid ${D.border2}`, borderRadius: 4, overflow: 'hidden' }}>
                {(['reuniao', 'ligacao'] as const).map(t => (
                  <button key={t} onClick={() => setTipo(t)}
                    style={{
                      padding: '5px 14px', border: 'none', cursor: 'pointer',
                      background: tipo === t ? D.accent : 'transparent',
                      color: tipo === t ? '#000' : D.text3,
                      fontFamily: D.ui, fontSize: 11, fontWeight: tipo === t ? 700 : 400,
                      transition: 'background 0.15s',
                    }}>
                    {t === 'reuniao' ? 'Reuniões' : 'Ligações'}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ fontSize: 12, color: D.text2, marginTop: 3 }}>
              Desempenho de {tipo === 'reuniao' ? 'reuniões de vendas' : 'ligações de prospecção'}
            </div>
          </div>

          {/* Date filter */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            {/* Preset buttons */}
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {PRESETS.map(p => (
                <button key={p.key} onClick={() => setPreset(p.key)}
                  style={{
                    padding: '5px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 11, fontFamily: D.ui,
                    border: `1px solid ${preset === p.key ? D.accent : D.border2}`,
                    background: preset === p.key ? `${D.accent}15` : D.surface2,
                    color: preset === p.key ? D.accent : D.text3,
                    fontWeight: preset === p.key ? 600 : 400,
                    transition: 'all 0.12s',
                  }}>
                  {p.label}
                </button>
              ))}
            </div>
            {/* Custom date inputs */}
            {preset === 'personalizado' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={dateSt} />
                <span style={{ color: D.text3, fontSize: 11 }}>—</span>
                <input type="date" value={customTo}   onChange={e => setCustomTo(e.target.value)}   style={dateSt} />
              </div>
            )}
          </div>
        </div>

        {hasFilter && (
          <div style={{ marginTop: 8, fontFamily: D.mono, fontSize: 9, color: D.accent, letterSpacing: '0.06em' }}>
            ● Filtro ativo — {filtered.length} {recordLabel.toLowerCase()} no período
          </div>
        )}
      </div>

      <div style={{ padding: '0 32px 40px' }}>

        {/* ── Metric cards ──────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 20 }}>
          {[
            { tag: `Total de ${recordLabel}`,   val: String(filtered.length), sub: hasFilter ? 'No período' : 'Total na plataforma' },
            { tag: 'Nota Média Geral',           val: fmtScore(avgScore),      sub: 'Média geral', color: scoreColor(avgScore) },
            { tag: 'Vendedores Ativos',          val: String(sellers.length),  sub: 'Na plataforma' },
            { tag: `${recordLabel} Analisadas`,  val: String(scored.length),   sub: `${filtered.length > 0 ? Math.round((scored.length / filtered.length) * 100) : 0}% do total`, color: D.accent },
          ].map(card => (
            <div key={card.tag} style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 5, padding: '18px 20px' }}>
              <div style={{ fontFamily: D.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: D.text3, marginBottom: 10 }}>{card.tag}</div>
              <div style={{ fontFamily: D.mono, fontSize: 32, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1, marginBottom: 6, color: (card as { color?: string }).color ?? D.text1 }}>{card.val}</div>
              <div style={{ fontSize: 11, color: D.text3 }}>{card.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Chart + Criteria ──────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 10, marginBottom: 16 }}>

          {/* Chart panel */}
          <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 5, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 18px', borderBottom: `1px solid ${D.border}` }}>
              <span style={{ fontFamily: D.mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: D.text2 }}>Evolução de Performance</span>
              <div style={{ display: 'flex', background: D.surface2, border: `1px solid ${D.border2}`, borderRadius: 4, overflow: 'hidden' }}>
                {(['criterios', 'vendedores'] as const).map(m => (
                  <button key={m} onClick={() => setChartMode(m)}
                    style={{
                      padding: '4px 10px', border: 'none', cursor: 'pointer',
                      background: chartMode === m ? D.accent : 'transparent',
                      color: chartMode === m ? '#000' : D.text3,
                      fontFamily: D.ui, fontSize: 10, fontWeight: chartMode === m ? 700 : 400,
                      transition: 'background 0.15s',
                    }}>
                    {m === 'criterios' ? 'Critérios' : 'Por Vendedor'}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ padding: 18 }}>
              <div style={{ height: 200, position: 'relative' }}>
                {chartDatasets.every(ds => ds.data.every(v => v === 0)) ? (
                  <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: D.mono, fontSize: 10, color: D.text3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Sem dados no período
                  </div>
                ) : (
                  <DashboardChart labels={chartLabels} datasets={chartDatasets} />
                )}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
                {chartDatasets.map(ds => (
                  <span key={ds.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontFamily: D.mono, fontSize: 9, color: D.text3 }}>
                    <span style={{ width: 14, height: ds.dashed ? 1 : 2, background: ds.color, borderRadius: 1, display: 'inline-block', opacity: ds.dashed ? 0.7 : 1 }} />
                    {ds.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Criteria panel */}
          <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 5, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${D.border}` }}>
              <span style={{ fontFamily: D.mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: D.text2 }}>Distribuição por Critério</span>
            </div>
            <div style={{ padding: 18 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {Object.entries(criteriaAvg).map(([label, val]) => (
                  <div key={label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                      <span style={{ fontSize: 11, color: D.text2 }}>{label}</span>
                      <span style={{ fontFamily: D.mono, fontSize: 13, fontWeight: 700, letterSpacing: '-0.02em', color: scoreColor(val) }}>{fmtScore(val)}</span>
                    </div>
                    <div style={{ height: 2, background: D.border2, borderRadius: 1 }}>
                      {val != null && <div style={{ width: `${(val / 10) * 100}%`, height: 2, background: scoreColor(val), borderRadius: 1 }} />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Top sellers + Recent records ──────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>

          {/* Top Vendedores */}
          <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 5, overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: `1px solid ${D.border}` }}>
              <span style={{ fontFamily: D.mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: D.text2 }}>Top Vendedores</span>
            </div>
            <div style={{ padding: '8px 18px' }}>
              {topSellers.length === 0 ? (
                <div style={{ padding: '24px 0', textAlign: 'center', fontFamily: D.mono, fontSize: 10, color: D.text3 }}>Sem dados no período</div>
              ) : topSellers.map((v, i) => (
                <div key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: i < topSellers.length - 1 ? `1px solid ${D.border}` : 'none' }}>
                  <div style={{ width: 20, textAlign: 'right', fontFamily: D.mono, fontSize: 10, color: D.text3, flexShrink: 0 }}>#{i + 1}</div>
                  <div style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: `${SELLER_COLORS[i % SELLER_COLORS.length]}18`,
                    border: `1px solid ${SELLER_COLORS[i % SELLER_COLORS.length]}40`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 700, color: SELLER_COLORS[i % SELLER_COLORS.length], fontFamily: D.mono, flexShrink: 0,
                  }}>{v.initials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: D.text1 }}>{v.name}</div>
                    <div style={{ fontSize: 11, color: D.text3, marginTop: 2 }}>{v.count} {recordLabel.toLowerCase()}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontFamily: D.mono, fontSize: 18, fontWeight: 700, letterSpacing: '-0.03em', color: scoreColor(v.score) }}>{v.score.toFixed(1)}</div>
                    <div style={{ fontFamily: D.mono, fontSize: 9, color: D.text3 }}>nota média</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent records */}
          <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 5, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: `1px solid ${D.border}` }}>
              <span style={{ fontFamily: D.mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: D.text2 }}>
                {hasFilter ? `${recordLabel} no Período` : `Últimas ${recordLabel}`}
              </span>
              <a href={recordPath} style={{ fontFamily: D.mono, fontSize: 9, color: D.accent, textDecoration: 'none' }}>Ver Todas →</a>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {recentRecords.length === 0 ? (
                  <tr><td style={{ padding: '24px 18px', textAlign: 'center', fontFamily: D.mono, fontSize: 10, color: D.text3 }}>Nenhum registro no período</td></tr>
                ) : recentRecords.map(r => (
                  <tr key={r.id}>
                    <td style={{ padding: '13px 18px', borderBottom: `1px solid ${D.border}`, verticalAlign: 'middle' }}>
                      <a href={recordDetail(r.id)} style={{ textDecoration: 'none', display: 'block' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: D.text1 }}>{r.titulo}</div>
                        {r.cliente_nome  && <div style={{ fontSize: 11, color: D.text3, marginTop: 2 }}>{r.cliente_nome}</div>}
                        {r.vendedor_nome && <div style={{ fontSize: 11, color: D.text3 }}>{r.vendedor_nome}</div>}
                      </a>
                    </td>
                    <td style={{ padding: '13px 18px', borderBottom: `1px solid ${D.border}`, textAlign: 'right', verticalAlign: 'middle' }}>
                      {(r.status === 'processado' || r.status === 'done' || r.status === 'partial') ? (
                        <span style={{ fontFamily: D.mono, fontSize: 18, fontWeight: 700, letterSpacing: '-0.03em', color: scoreColor(r.nota_geral) }}>
                          {fmtScore(r.nota_geral)}
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px',
                          borderRadius: 3, fontFamily: D.mono, fontSize: 9, fontWeight: 700,
                          textTransform: 'uppercase', letterSpacing: '0.06em',
                          background: 'rgba(245,158,11,0.1)', color: D.amber,
                          border: '1px solid rgba(245,158,11,0.2)',
                        }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
                          {r.status ?? 'Processando'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
