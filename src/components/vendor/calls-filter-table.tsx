'use client'

import { useState } from 'react'
import { V } from './colors'
import { ScoreRing } from './score-ring'
import { VendorUploadModal } from './vendor-upload-modal'

export interface CallRow {
  id: string
  titulo: string
  nota_geral: number | null
  data_hora: string | null
  status: string | null
  duracao: number | null
  /** true quando a linha representa um pacote (zip) inteiro, não uma ligação avulsa */
  isBatch?: boolean
  /** total de ligações dentro do pacote, só relevante quando isBatch */
  batchCount?: number
}

interface Props {
  calls: CallRow[]
}

const chevron = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%234A4A56' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")"

const selStyle: React.CSSProperties = {
  padding: '7px 28px 7px 12px',
  borderRadius: 4,
  border: `1px solid ${V.border2}`,
  background: V.surface2,
  color: V.text2,
  fontSize: 12,
  fontFamily: V.ui,
  outline: 'none',
  cursor: 'pointer',
  appearance: 'none',
  WebkitAppearance: 'none',
  backgroundImage: chevron,
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 8px center',
}

export function CallsFilterTable({ calls }: Props) {
  const [search, setSearch]       = useState('')
  const [statusF, setStatusF]     = useState('all')
  const [dateFrom, setDateFrom]   = useState('')
  const [dateTo, setDateTo]       = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  const hasDateFilter = !!(dateFrom || dateTo)

  const filtered = calls.filter(c => {
    if (search) {
      if (!c.titulo.toLowerCase().includes(search.toLowerCase())) return false
    }
    if (statusF !== 'all') {
      if (statusF === 'done'       && c.status !== 'processado') return false
      if (statusF === 'processing' && c.status === 'processado') return false
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
      {/* Page head */}
      <div style={{ padding: '28px 32px 0', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: V.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em', color: V.accent, marginBottom: 4 }}>Portal do Vendedor</div>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.04em', marginBottom: 3, color: V.text1, margin: '0 0 3px' }}>Minhas Ligações</h1>
            <div style={{ fontSize: 12, color: V.text2 }}>Ligações comerciais analisadas pela IA</div>
          </div>
          <div>
            <button
              onClick={() => setModalOpen(true)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 4,
                border: `1px solid ${V.accent}`,
                background: V.accent, color: '#000',
                fontSize: 12, fontFamily: V.ui, fontWeight: 700,
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              + Nova Ligação
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '0 32px 40px' }}>
        {calls.length > 0 && (
          /* Filter bar */
          <div style={{
            marginBottom: 14,
            background: V.surface,
            border: `1px solid ${V.border}`,
            borderRadius: 5,
            padding: '12px 14px',
          }}>
            {/* Row 1: search + status */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: V.surface2, border: `1px solid ${V.border2}`, borderRadius: 4, padding: '7px 12px' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={V.text3} strokeWidth="2" style={{ flexShrink: 0 }}>
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  type="text"
                  placeholder="Buscar por título…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  style={{ flex: 1, border: 'none', outline: 'none', fontFamily: V.ui, fontSize: 12, color: V.text1, background: 'none' }}
                />
              </div>
              <select value={statusF} onChange={e => setStatusF(e.target.value)} style={selStyle}>
                <option value="all">Todos os status</option>
                <option value="done">Analisada</option>
                <option value="processing">Processando</option>
              </select>
            </div>
            {/* Row 2: date filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontFamily: V.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: V.text3, flexShrink: 0 }}>
                Período
              </span>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                title="Data inicial"
                style={{ ...selStyle, width: 'auto', flex: 1, colorScheme: 'dark', paddingRight: 10, backgroundImage: 'none' }}
              />
              <span style={{ color: V.text3, fontSize: 11, flexShrink: 0 }}>—</span>
              <input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                title="Data final"
                style={{ ...selStyle, width: 'auto', flex: 1, colorScheme: 'dark', paddingRight: 10, backgroundImage: 'none' }}
              />
              {hasDateFilter && (
                <button
                  onClick={() => { setDateFrom(''); setDateTo('') }}
                  style={{ background: 'none', border: 'none', color: V.text3, cursor: 'pointer', fontSize: 13, padding: '0 4px', flexShrink: 0 }}
                  title="Limpar datas"
                >✕</button>
              )}
            </div>
          </div>
        )}

        {/* Table / empty state */}
        {filtered.length > 0 ? (
          <div style={{ background: V.surface, border: `1px solid ${V.border}`, borderRadius: 5, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Ligação', 'Data', 'Duração', 'Status', 'Nota', ''].map(h => (
                    <th key={h} style={{
                      fontFamily: V.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em',
                      color: V.text3, fontWeight: 500, textAlign: 'left',
                      padding: '9px 16px', borderBottom: `1px solid ${V.border}`,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => {
                  const href = c.isBatch ? `/vendor/calls/batch/${c.id}` : `/vendor/calls/${c.id}`
                  const isReady = c.status === 'processado'
                  const isError = c.status === 'error'
                  return (
                    <tr
                      key={c.id}
                      onClick={() => { window.location.href = href }}
                      style={{ cursor: 'pointer' }}
                    >
                      <td style={{ padding: '12px 16px', borderBottom: `1px solid ${V.border}` }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          {c.isBatch && <span style={{ fontSize: 14, flexShrink: 0 }}>📦</span>}
                          <div style={{ fontSize: 13, fontWeight: 600, color: V.text1 }}>{c.titulo}</div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: `1px solid ${V.border}`, fontFamily: V.mono, fontSize: 12, color: V.text2 }}>
                        {c.data_hora ? new Date(c.data_hora).toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: `1px solid ${V.border}`, fontFamily: V.mono, fontSize: 12, color: V.text2 }}>
                        {c.isBatch ? `${c.batchCount ?? 0} ligaç${c.batchCount === 1 ? 'ão' : 'ões'}` : (c.duracao ? `${Math.floor(c.duracao / 60)}min` : '—')}
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: `1px solid ${V.border}` }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 3,
                          fontFamily: V.mono, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                          background: isReady ? 'rgba(0,229,160,0.08)' : isError ? 'rgba(255,68,85,0.08)' : 'rgba(245,158,11,0.1)',
                          color: isReady ? V.accent : isError ? V.red : V.amber,
                          border: `1px solid ${isReady ? 'rgba(0,229,160,0.15)' : isError ? 'rgba(255,68,85,0.2)' : 'rgba(245,158,11,0.2)'}`,
                        }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
                          {isReady ? 'Analisada' : isError ? 'Erro' : 'Processando'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: `1px solid ${V.border}` }}>
                        <ScoreRing score={c.nota_geral} size={42} />
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: `1px solid ${V.border}`, textAlign: 'right' }}>
                        <a
                          href={href}
                          onClick={e => e.stopPropagation()}
                          style={{
                            display: 'inline-flex', alignItems: 'center', padding: '5px 10px',
                            borderRadius: 4, border: `1px solid ${V.border2}`, background: V.surface2,
                            color: V.text2, fontSize: 10, fontFamily: V.ui, fontWeight: 600,
                            textDecoration: 'none', whiteSpace: 'nowrap',
                          }}
                        >
                          Ver Detalhes
                        </a>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: 80, textAlign: 'center' }}>
            <div style={{ fontFamily: V.mono, fontSize: 10, color: V.text3, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
              {calls.length === 0 ? 'Nenhuma ligação registrada ainda' : 'Nenhuma ligação encontrada'}
            </div>
            {calls.length === 0 && (
              <button
                onClick={() => setModalOpen(true)}
                style={{
                  padding: '9px 18px', borderRadius: 4, border: `1px solid ${V.accent}`,
                  background: V.accentDim, color: V.accent,
                  fontSize: 12, fontFamily: V.ui, fontWeight: 600, cursor: 'pointer',
                }}
              >
                + Enviar primeira ligação
              </button>
            )}
          </div>
        )}
      </div>

      <VendorUploadModal open={modalOpen} onClose={() => setModalOpen(false)} tipo="ligacao" />
    </>
  )
}
