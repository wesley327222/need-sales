'use client'

import { useState } from 'react'
import { V, scoreColor } from './colors'
import { ScoreRing } from './score-ring'
import { VendorUploadModal } from './vendor-upload-modal'

interface Meeting {
  id: string
  titulo: string
  nota_geral: number | null
  data_hora: string | null
  status: string | null
  duracao: number | null
  clientes: { nome: string } | null
}

interface Props {
  meetings: Meeting[]
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

export function MeetingsFilterTable({ meetings }: Props) {
  const [search, setSearch]       = useState('')
  const [statusF, setStatusF]     = useState('all')
  const [scoreF, setScoreF]       = useState('all')
  const [dateFrom, setDateFrom]   = useState('')
  const [dateTo, setDateTo]       = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  const hasDateFilter = !!(dateFrom || dateTo)

  const filtered = meetings.filter(m => {
    if (search) {
      const q = search.toLowerCase()
      const inTitle  = m.titulo.toLowerCase().includes(q)
      const inClient = m.clientes?.nome.toLowerCase().includes(q) ?? false
      if (!inTitle && !inClient) return false
    }
    if (statusF !== 'all') {
      const isDone = m.status === 'processado' || m.status === 'done' || m.status === 'partial'
      if (statusF === 'done'       && !isDone) return false
      if (statusF === 'processing' && isDone)  return false
    }
    if (scoreF !== 'all' && m.nota_geral != null) {
      if (scoreF === 'hi'  && m.nota_geral < 8)                          return false
      if (scoreF === 'mid' && (m.nota_geral < 6 || m.nota_geral >= 8))  return false
    }
    if (dateFrom || dateTo) {
      const d = m.data_hora ? new Date(m.data_hora).toISOString().slice(0, 10) : null
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
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.04em', marginBottom: 3, color: V.text1, margin: '0 0 3px' }}>Minhas Reuniões</h1>
            <div style={{ fontSize: 12, color: V.text2 }}>Análise das suas reuniões de vendas</div>
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
              + Nova Reunião
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '0 32px 40px' }}>
        {/* Filter bar */}
        <div style={{
          marginBottom: 14,
          background: V.surface,
          border: `1px solid ${V.border}`,
          borderRadius: 5,
          padding: '12px 14px',
        }}>
          {/* Row 1: search + status + score */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: V.surface2, border: `1px solid ${V.border2}`, borderRadius: 4, padding: '7px 12px' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={V.text3} strokeWidth="2" style={{ flexShrink: 0 }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                placeholder="Buscar reunião ou cliente…"
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
            <select value={scoreF} onChange={e => setScoreF(e.target.value)} style={selStyle}>
              <option value="all">Todas as notas</option>
              <option value="hi">≥ 8.0</option>
              <option value="mid">6.0 – 7.9</option>
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

        {/* Table */}
        {filtered.length > 0 ? (
          <div style={{ background: V.surface, border: `1px solid ${V.border}`, borderRadius: 5, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Reunião / Cliente', 'Data', 'Duração', 'Status', 'Nota', ''].map(h => (
                    <th key={h} style={{
                      fontFamily: V.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em',
                      color: V.text3, fontWeight: 500, textAlign: 'left',
                      padding: '9px 16px', borderBottom: `1px solid ${V.border}`,
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => {
                  const dur = m.duracao ? `${Math.floor(m.duracao / 60)}min` : '—'
                  return (
                    <tr
                      key={m.id}
                      onClick={() => { window.location.href = `/vendor/meetings/${m.id}` }}
                      style={{ cursor: 'pointer' }}
                    >
                      <td style={{ padding: '12px 16px', borderBottom: `1px solid ${V.border}` }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: V.text1 }}>{m.titulo}</div>
                        {m.clientes?.nome && (
                          <div style={{ fontSize: 11, color: V.text3, marginTop: 2 }}>{m.clientes.nome}</div>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: `1px solid ${V.border}`, fontFamily: V.mono, fontSize: 12, color: V.text2 }}>
                        {m.data_hora ? new Date(m.data_hora).toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: `1px solid ${V.border}`, fontFamily: V.mono, fontSize: 12, color: V.text2 }}>{dur}</td>
                      <td style={{ padding: '12px 16px', borderBottom: `1px solid ${V.border}` }}>
                        {(() => {
                          const done = m.status === 'processado' || m.status === 'done' || m.status === 'partial'
                          const errored = m.status === 'error' || m.status === 'erro'
                          return (
                            <span style={{
                              display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 3,
                              fontFamily: V.mono, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                              background: done ? 'rgba(0,229,160,0.08)' : errored ? 'rgba(255,68,85,0.08)' : 'rgba(245,158,11,0.1)',
                              color: done ? V.accent : errored ? V.red : V.amber,
                              border: `1px solid ${done ? 'rgba(0,229,160,0.15)' : errored ? 'rgba(255,68,85,0.2)' : 'rgba(245,158,11,0.2)'}`,
                            }}>
                              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
                              {done ? 'Analisada' : errored ? 'Erro' : 'Processando'}
                            </span>
                          )
                        })()}
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: `1px solid ${V.border}` }}>
                        <ScoreRing score={m.nota_geral} size={42} />
                      </td>
                      <td style={{ padding: '12px 16px', borderBottom: `1px solid ${V.border}`, textAlign: 'right' }}>
                        <a
                          href={`/vendor/meetings/${m.id}`}
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
              {meetings.length === 0 ? 'Nenhuma reunião registrada ainda' : 'Nenhuma reunião encontrada'}
            </div>
            {meetings.length === 0 && (
              <button
                onClick={() => setModalOpen(true)}
                style={{
                  padding: '9px 18px', borderRadius: 4, border: `1px solid ${V.accent}`,
                  background: V.accentDim, color: V.accent,
                  fontSize: 12, fontFamily: V.ui, fontWeight: 600, cursor: 'pointer',
                }}
              >
                + Enviar primeira reunião
              </button>
            )}
          </div>
        )}
      </div>

      <VendorUploadModal open={modalOpen} onClose={() => setModalOpen(false)} tipo="reuniao" />
    </>
  )
}
