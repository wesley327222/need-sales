'use client'

const D = {
  surface:  '#111113', surface2: '#18181B',
  border:   '#1E1E22', border2:  '#2A2A30',
  text1:    '#F0F0F4', text2:    '#8A8A96', text3:    '#4A4A56',
  accent:   '#00E5A0', amber:    '#F59E0B', red:      '#FF4455',
  mono:     "'JetBrains Mono', monospace",
  ui:       "'Space Grotesk', system-ui, sans-serif",
}

function scoreColor(s: number | null | undefined) {
  if (s == null) return D.text3
  if (s >= 7.5) return D.accent
  if (s >= 6)   return D.amber
  return D.red
}

function fmtScore(s: number | null | undefined) {
  return s == null ? '—' : s.toFixed(1)
}

export interface SellerRow {
  id: string
  nome: string
  email: string
  initials: string
  avatarUrl: string | null
  totalMeetings: number
  totalCalls: number
  avgScore: number | null
  avgEscuta: number | null
  avgObjecoes: number | null
  avgApresentacao: number | null
  avgNota1: number | null
  avgNota2: number | null
  avgNota3: number | null
  avgNota4: number | null
}

interface Props {
  sellers: SellerRow[]
  onEdit: (seller: SellerRow) => void
  /** Labels dos critérios opcionais ativos hoje (config atual da empresa, reuniões) — alinhados a nota_1..nota_4 */
  criteriaLabels?: string[]
}

export function VendorsTable({ sellers, onEdit, criteriaLabels = [] }: Props) {
  if (sellers.length === 0) {
    return (
      <div style={{ padding: '80px 0', textAlign: 'center', fontFamily: D.mono, fontSize: 10, color: D.text3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
        Nenhum vendedor cadastrado ainda
      </div>
    )
  }

  const dynamicCols = criteriaLabels.slice(0, 4)
  const legacyHeaders = ['Escuta Ativa', 'Objeções', 'Apresentação']

  return (
    <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 6, overflow: 'hidden' }}>
      <div style={{ padding: '14px 20px', borderBottom: `1px solid ${D.border}` }}>
        <div style={{ fontFamily: D.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: D.text3 }}>Ranking de Performance</div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {['#', 'Vendedor', 'Reuniões', 'Ligações', 'Nota Geral', ...legacyHeaders, ...dynamicCols, ''].map((h, i) => (
              <th key={i} style={{ fontFamily: D.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: D.text3, fontWeight: 500, textAlign: 'left', padding: '10px 16px', borderBottom: `1px solid ${D.border}` }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sellers.map((s, i) => (
            <tr key={s.id}
              onMouseEnter={e => (e.currentTarget.style.background = D.surface2)}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <td style={{ padding: '12px 16px', borderBottom: `1px solid ${D.border}`, fontFamily: D.mono, fontSize: 11, color: i === 0 ? D.accent : D.text3, fontWeight: 700 }}>
                {i + 1}
              </td>
              <td style={{ padding: '12px 16px', borderBottom: `1px solid ${D.border}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', overflow: 'hidden', background: 'rgba(0,229,160,0.1)', border: '1px solid rgba(0,229,160,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: D.mono, fontSize: 10, fontWeight: 700, color: D.accent, flexShrink: 0 }}>
                    {s.avatarUrl
                      ? <img src={s.avatarUrl} alt={s.nome} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      : s.initials
                    }
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: D.text1 }}>{s.nome}</div>
                    <div style={{ fontSize: 11, color: D.text3, fontFamily: D.mono }}>{s.email}</div>
                  </div>
                </div>
              </td>
              <td style={{ padding: '12px 16px', borderBottom: `1px solid ${D.border}`, fontFamily: D.mono, fontSize: 12, color: D.text2 }}>{s.totalMeetings}</td>
              <td style={{ padding: '12px 16px', borderBottom: `1px solid ${D.border}`, fontFamily: D.mono, fontSize: 12, color: D.text2 }}>{s.totalCalls}</td>
              {[s.avgScore, s.avgEscuta, s.avgObjecoes, s.avgApresentacao, s.avgNota1, s.avgNota2, s.avgNota3, s.avgNota4]
                .slice(0, 4 + dynamicCols.length)
                .map((val, j) => (
                <td key={j} style={{ padding: '12px 16px', borderBottom: `1px solid ${D.border}` }}>
                  <span style={{ fontFamily: D.mono, fontSize: 14, fontWeight: 700, color: scoreColor(val) }}>{fmtScore(val)}</span>
                </td>
              ))}
              <td style={{ padding: '12px 16px', borderBottom: `1px solid ${D.border}` }}>
                <button
                  onClick={() => onEdit(s)}
                  style={{ background: 'none', border: `1px solid ${D.border2}`, borderRadius: 4, padding: '5px 12px', color: D.text2, fontSize: 11, fontFamily: D.mono, cursor: 'pointer', letterSpacing: '0.04em' }}
                >
                  Editar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
