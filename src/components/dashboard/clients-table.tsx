'use client'

import { useState } from 'react'

export interface ClientRow {
  id: string
  nome: string
  email: string | null
  telefone: string | null
  created_at: string | null
  total_reunioes: number
  total_ligacoes: number
  ultima_interacao: string | null
}

const D = {
  surface:  '#111113', surface2: '#18181B',
  border:   '#1E1E22', border2:  '#2A2A30',
  text1:    '#F0F0F4', text2:    '#8A8A96', text3:    '#4A4A56',
  accent:   '#00E5A0', blue:     '#4F8EF7',
  mono:     "'JetBrains Mono', monospace",
  ui:       "'Space Grotesk', system-ui, sans-serif",
}

interface Props { clients: ClientRow[] }

export function ClientsTable({ clients: initialClients }: Props) {
  const [clients,   setClients]   = useState(initialClients)
  const [search,    setSearch]    = useState('')
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [deleting,  setDeleting]  = useState(false)

  async function handleDelete(id: string) {
    setDeleting(true)
    try {
      const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erro ao excluir')
      setClients(prev => prev.filter(c => c.id !== id))
    } finally {
      setConfirmId(null)
      setDeleting(false)
    }
  }

  const filtered = clients.filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      c.nome.toLowerCase().includes(q) ||
      (c.email ?? '').toLowerCase().includes(q) ||
      (c.telefone ?? '').toLowerCase().includes(q)
    )
  })

  return (
    <>
      {/* Search bar */}
      <div style={{
        display: 'flex', gap: 8, marginBottom: 14,
        background: D.surface, border: `1px solid ${D.border}`,
        borderRadius: 5, padding: '12px 14px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: D.surface2, border: `1px solid ${D.border2}`, borderRadius: 4, padding: '7px 12px', flex: 1 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={D.text3} strokeWidth="2" style={{ flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text" placeholder="Buscar por nome, email ou telefone…"
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, border: 'none', outline: 'none', fontFamily: D.ui, fontSize: 12, color: D.text1, background: 'none' }}
          />
        </div>
      </div>

      {/* Summary */}
      <div style={{ fontFamily: D.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: D.text3, marginBottom: 10 }}>
        {filtered.length} cliente{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div style={{ padding: '80px 0', textAlign: 'center', fontFamily: D.mono, fontSize: 10, color: D.text3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {clients.length === 0 ? 'Nenhum cliente cadastrado ainda' : 'Nenhum resultado encontrado'}
        </div>
      ) : (
        <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 5, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Cliente', 'Email', 'Telefone', 'Reuniões', 'Ligações', 'Última Interação', ''].map((h, i) => (
                  <th key={i} style={{ fontFamily: D.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: D.text3, fontWeight: 500, textAlign: 'left', padding: '10px 16px', borderBottom: `1px solid ${D.border}` }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => {
                const initials = (c.nome ?? '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
                const lastDate = c.ultima_interacao
                  ? new Date(c.ultima_interacao).toLocaleDateString('pt-BR')
                  : '—'
                return (
                  <tr key={c.id}
                    style={{ cursor: 'default' }}
                    onMouseEnter={e => (e.currentTarget.style.background = D.surface2)}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '12px 16px', borderBottom: `1px solid ${D.border}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(79,142,247,0.1)', border: '1px solid rgba(79,142,247,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: D.mono, fontSize: 10, fontWeight: 700, color: D.blue, flexShrink: 0 }}>
                          {initials}
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: D.text1 }}>{c.nome}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: `1px solid ${D.border}`, fontFamily: D.mono, fontSize: 12, color: D.text2 }}>{c.email ?? '—'}</td>
                    <td style={{ padding: '12px 16px', borderBottom: `1px solid ${D.border}`, fontFamily: D.mono, fontSize: 12, color: D.text2 }}>{c.telefone ?? '—'}</td>
                    <td style={{ padding: '12px 16px', borderBottom: `1px solid ${D.border}` }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 3, fontFamily: D.mono, fontSize: 10, fontWeight: 600, background: c.total_reunioes > 0 ? 'rgba(0,229,160,0.08)' : 'transparent', color: c.total_reunioes > 0 ? D.accent : D.text3, border: `1px solid ${c.total_reunioes > 0 ? 'rgba(0,229,160,0.15)' : D.border2}` }}>
                        {c.total_reunioes}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: `1px solid ${D.border}` }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 3, fontFamily: D.mono, fontSize: 10, fontWeight: 600, background: c.total_ligacoes > 0 ? 'rgba(79,142,247,0.08)' : 'transparent', color: c.total_ligacoes > 0 ? D.blue : D.text3, border: `1px solid ${c.total_ligacoes > 0 ? 'rgba(79,142,247,0.15)' : D.border2}` }}>
                        {c.total_ligacoes}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', borderBottom: `1px solid ${D.border}`, fontFamily: D.mono, fontSize: 12, color: D.text2 }}>{lastDate}</td>
                    <td style={{ padding: '12px 16px', borderBottom: `1px solid ${D.border}`, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      {confirmId === c.id ? (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <button
                            onClick={() => handleDelete(c.id)}
                            disabled={deleting}
                            style={{ padding: '4px 10px', borderRadius: 3, border: '1px solid rgba(255,68,85,0.4)', background: 'rgba(255,68,85,0.12)', color: '#FF4455', fontSize: 10, fontFamily: D.ui, fontWeight: 700, cursor: 'pointer' }}>
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
                          title="Excluir cliente"
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
    </>
  )
}
