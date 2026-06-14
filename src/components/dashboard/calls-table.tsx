'use client'

import { useState } from 'react'
import { ScoreRing } from '@/components/vendor/score-ring'
import { VendorUploadModal } from '@/components/vendor/vendor-upload-modal'

const D = {
  surface:  '#111113', surface2: '#18181B',
  border:   '#1E1E22', border2:  '#2A2A30',
  text1:    '#F0F0F4', text2:    '#8A8A96', text3:    '#4A4A56',
  accent:   '#00E5A0', amber:    '#F59E0B', red:      '#FF4455',
  mono:     "'JetBrains Mono', monospace",
  ui:       "'Space Grotesk', system-ui, sans-serif",
}

const chevron = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%234A4A56' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")"

const selSt: React.CSSProperties = {
  padding: '7px 28px 7px 12px', borderRadius: 4,
  border: `1px solid ${D.border2}`, background: D.surface2,
  color: D.text2, fontSize: 12, fontFamily: D.ui,
  outline: 'none', cursor: 'pointer',
  appearance: 'none', WebkitAppearance: 'none',
  backgroundImage: chevron, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 8px center',
}

const dateSt: React.CSSProperties = {
  ...selSt,
  flex: 1, width: 'auto', backgroundImage: 'none',
  paddingRight: 10, colorScheme: 'dark' as React.CSSProperties['colorScheme'],
}

export interface CallRow {
  id: string
  titulo: string
  nota_geral: number | null
  data_hora: string | null
  duracao: number | null
  status: string | null
  vendedor_nome: string | null
}

interface Props {
  calls: CallRow[]
  vendorNames: string[]
}

export function CallsTable({ calls: initialCalls, vendorNames }: Props) {
  const [calls,     setCalls]     = useState(initialCalls)
  const [search,    setSearch]    = useState('')
  const [vendor,    setVendor]    = useState('all')
  const [statusF,   setStatusF]   = useState('all')
  const [scoreF,    setScoreF]    = useState('all')
  const [dateFrom,  setDateFrom]  = useState('')
  const [dateTo,    setDateTo]    = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [deleting,  setDeleting]  = useState(false)

  const hasDateFilter = !!(dateFrom || dateTo)

  async function handleDelete(id: string) {
    setDeleting(true)
    try {
      const res = await fetch(`/api/meetings/${id}?tipo=ligacao`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erro ao excluir')
      setCalls(prev => prev.filter(c => c.id !== id))
    } finally {
      setConfirmId(null)
      setDeleting(false)
    }
  }

  const filtered = calls.filter(c => {
    if (search) {
      const q = search.toLowerCase()
      if (
        !c.titulo.toLowerCase().includes(q) &&
        !(c.vendedor_nome ?? '').toLowerCase().includes(q)
      ) return false
    }
    if (vendor !== 'all' && c.vendedor_nome !== vendor) return false
    if (statusF === 'done'       && c.status !== 'processado')  return false
    if (statusF === 'processing' && c.status === 'processado')  return false
    if (scoreF !== 'all' && c.nota_geral != null) {
      if (scoreF === 'hi'  && c.nota_geral < 8)                        return false
      if (scoreF === 'mid' && (c.nota_geral < 6 || c.nota_geral >= 8)) return false
      if (scoreF === 'lo'  && c.nota_geral >= 6)                       return false
    }
    if (dateFrom || dateTo) {
      const d = c.data_hora ? new Date(c.data_hora).toISOString().slice(0, 10) : null
      if (!d) return false
      if (dateFrom && d < dateFrom) return false
      if (dateTo   && d > dateTo)   return false
    }
    return true
  })

  return (
    <>
      {/* Page header */}
      <div style={{ padding: '28px 32px 0', marginBottom: 20, fontFamily: D.ui }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: D.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em', color: D.accent, marginBottom: 4 }}>
              Need Sales
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.04em', color: D.text1, margin: '0 0 3px' }}>
              Ligações
            </h1>
            <div style={{ fontSize: 12, color: D.text2 }}>Análise inteligente de ligações de vendas</div>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '7px 14px', borderRadius: 4,
              border: `1px solid ${D.accent}`, background: D.accent,
              color: '#000', fontSize: 12, fontFamily: D.ui, fontWeight: 700,
              cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            + Nova Ligação
          </button>
        </div>
      </div>

      <div style={{ padding: '0 32px 40px' }}>
        {/* Filter bar */}
        <div style={{
          marginBottom: 14,
          background: D.surface, border: `1px solid ${D.border}`,
          borderRadius: 5, padding: '12px 14px',
        }}>
          {/* Row 1: search + dropdowns */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 8, marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: D.surface2, border: `1px solid ${D.border2}`, borderRadius: 4, padding: '7px 12px' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={D.text3} strokeWidth="2" style={{ flexShrink: 0 }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text" placeholder="Buscar por título ou vendedor…"
                value={search} onChange={e => setSearch(e.target.value)}
                style={{ flex: 1, border: 'none', outline: 'none', fontFamily: D.ui, fontSize: 12, color: D.text1, background: 'none' }}
              />
            </div>
            <select value={vendor} onChange={e => setVendor(e.target.value)} style={selSt}>
              <option value="all">Todos os vendedores</option>
              {vendorNames.map(n => <option key={n} value={n}>{n}</option>)}
            </select>
            <select value={statusF} onChange={e => setStatusF(e.target.value)} style={selSt}>
              <option value="all">Todos os status</option>
              <option value="done">Analisada</option>
              <option value="processing">Processando</option>
            </select>
            <select value={scoreF} onChange={e => setScoreF(e.target.value)} style={selSt}>
              <option value="all">Todas as notas</option>
              <option value="hi">≥ 8.0</option>
              <option value="mid">6.0 – 7.9</option>
              <option value="lo">Abaixo de 6.0</option>
            </select>
          </div>
          {/* Row 2: date filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: D.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: D.text3, flexShrink: 0 }}>
              Período
            </span>
            <input
              type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
              title="Data inicial" style={dateSt}
            />
            <span style={{ color: D.text3, fontSize: 11, flexShrink: 0 }}>—</span>
            <input
              type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
              title="Data final" style={dateSt}
            />
            {hasDateFilter && (
              <button
                onClick={() => { setDateFrom(''); setDateTo('') }}
                style={{ background: 'none', border: 'none', color: D.text3, cursor: 'pointer', fontSize: 13, padding: '0 4px', flexShrink: 0 }}
                title="Limpar datas"
              >✕</button>
            )}
          </div>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div style={{ padding: '80px 0', textAlign: 'center', fontFamily: D.mono, fontSize: 10, color: D.text3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            {calls.length === 0 ? 'Nenhuma ligação cadastrada ainda' : 'Nenhum resultado encontrado'}
          </div>
        ) : (
          <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 5, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Ligação', 'Vendedor', 'Data', 'Duração', 'Status', 'Nota', '', ''].map((h, i) => (
                    <th key={i} style={{ fontFamily: D.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: D.text3, fontWeight: 500, textAlign: 'left', padding: '10px 16px', borderBottom: `1px solid ${D.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const dur  = c.duracao  ? `${Math.floor(c.duracao / 60)}min` : '—'
                  const date = c.data_hora ? new Date(c.data_hora).toLocaleDateString('pt-BR') : '—'
                  const done = c.status === 'processado'
                  return (
                    <tr key={c.id}
                      onClick={() => { window.location.href = `/calls/${c.id}` }}
                      style={{ cursor: 'pointer' }}
                      onMouseEnter={e => (e.currentTarget.style.background = D.surface2)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '13px 16px', borderBottom: `1px solid ${D.border}` }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: D.text1, letterSpacing: '-0.01em' }}>{c.titulo}</div>
                      </td>
                      <td style={{ padding: '13px 16px', borderBottom: `1px solid ${D.border}`, fontFamily: D.mono, fontSize: 12, color: D.text2 }}>{c.vendedor_nome ?? '—'}</td>
                      <td style={{ padding: '13px 16px', borderBottom: `1px solid ${D.border}`, fontFamily: D.mono, fontSize: 12, color: D.text2 }}>{date}</td>
                      <td style={{ padding: '13px 16px', borderBottom: `1px solid ${D.border}`, fontFamily: D.mono, fontSize: 12, color: D.text2 }}>{dur}</td>
                      <td style={{ padding: '13px 16px', borderBottom: `1px solid ${D.border}` }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          padding: '3px 8px', borderRadius: 3,
                          fontFamily: D.mono, fontSize: 9, fontWeight: 700,
                          textTransform: 'uppercase', letterSpacing: '0.06em',
                          background: done ? 'rgba(0,229,160,0.08)' : 'rgba(245,158,11,0.1)',
                          color: done ? D.accent : D.amber,
                          border: `1px solid ${done ? 'rgba(0,229,160,0.15)' : 'rgba(245,158,11,0.2)'}`,
                        }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
                          {done ? 'Analisada' : 'Processando'}
                        </span>
                      </td>
                      <td style={{ padding: '13px 16px', borderBottom: `1px solid ${D.border}` }}>
                        <ScoreRing score={c.nota_geral} size={44} />
                      </td>
                      <td style={{ padding: '13px 16px', borderBottom: `1px solid ${D.border}`, textAlign: 'right' }}>
                        <a href={`/calls/${c.id}`} onClick={e => e.stopPropagation()}
                          style={{ display: 'inline-flex', alignItems: 'center', padding: '5px 12px', borderRadius: 4, border: `1px solid ${D.border2}`, background: D.surface2, color: D.text2, fontSize: 10, fontFamily: D.ui, fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                          Ver Detalhes
                        </a>
                      </td>
                      <td style={{ padding: '13px 16px', borderBottom: `1px solid ${D.border}`, textAlign: 'right', whiteSpace: 'nowrap' }}
                        onClick={e => e.stopPropagation()}>
                        {confirmId === c.id ? (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                            <button
                              onClick={() => handleDelete(c.id)}
                              disabled={deleting}
                              style={{ padding: '4px 10px', borderRadius: 3, border: '1px solid rgba(255,68,85,0.4)', background: 'rgba(255,68,85,0.12)', color: D.red, fontSize: 10, fontFamily: D.ui, fontWeight: 700, cursor: 'pointer' }}>
                              {deleting ? '...' : 'Confirmar'}
                            </button>
                            <button
                              onClick={() => setConfirmId(null)}
                              disabled={deleting}
                              style={{ padding: '4px 8px', borderRadius: 3, border: `1px solid ${D.border2}`, background: 'none', color: D.text3, fontSize: 10, fontFamily: D.ui, cursor: 'pointer' }}>
                              Cancelar
                            </button>
                          </span>
                        ) : (
                          <button
                            onClick={() => setConfirmId(c.id)}
                            title="Excluir ligação"
                            style={{ padding: '5px 8px', borderRadius: 3, border: `1px solid ${D.border2}`, background: 'none', color: D.text3, cursor: 'pointer', lineHeight: 1 }}>
                            🗑
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <VendorUploadModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        tipo="ligacao"
        pathPrefix=""
      />
    </>
  )
}
