'use client'

import { useState } from 'react'
import { V } from './colors'

interface Action {
  id: number
  priority: 'alta' | 'media' | 'baixa'
  text: string
  objetivo: string
}

const PRIORITY_STYLE: Record<Action['priority'], { bg: string; color: string; border: string; label: string }> = {
  alta:  { bg: 'rgba(255,68,85,0.15)',  color: '#FF4455', border: 'rgba(255,68,85,0.25)',  label: 'Prioridade Alta' },
  media: { bg: 'rgba(245,158,11,0.12)', color: '#F59E0B', border: 'rgba(245,158,11,0.22)', label: 'Prioridade Média' },
  baixa: { bg: 'rgba(79,142,247,0.1)',  color: '#4F8EF7', border: 'rgba(79,142,247,0.2)',  label: 'Prioridade Baixa' },
}

function CheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  )
}

export function ActionCards({ actions }: { actions: Action[] }) {
  const [done, setDone] = useState<Record<number, boolean>>({})

  const pendingCount = actions.filter(a => !done[a.id]).length

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontFamily: V.mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: V.text2 }}>
          Ações Recomendadas
        </div>
        <div style={{ fontFamily: V.mono, fontSize: 9, color: V.text3 }}>{pendingCount} pendentes</div>
      </div>

      {actions.map(a => {
        const isDone = !!done[a.id]
        const p = PRIORITY_STYLE[a.priority]
        return (
          <div key={a.id} style={{
            background: V.surface, border: `1px solid ${V.border}`,
            borderRadius: 5, overflow: 'hidden', marginBottom: 10,
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '11px 14px', background: V.surface2, borderBottom: `1px solid ${V.border}`,
            }}>
              <span style={{
                fontFamily: V.mono, fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.1em',
                padding: '3px 8px', borderRadius: 2, fontWeight: 700,
                background: p.bg, color: p.color, border: `1px solid ${p.border}`,
              }}>
                {p.label}
              </span>
              <span style={{
                fontFamily: V.mono, fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.08em',
                display: 'flex', alignItems: 'center', gap: 5,
                color: isDone ? V.accent : V.text3,
              }}>
                {isDone && <CheckIcon />}
                {isDone ? 'Concluída' : 'Pendente'}
              </span>
            </div>

            <div style={{ padding: '14px 14px 10px' }}>
              <div style={{ fontSize: 12.5, color: V.text1, lineHeight: 1.6, marginBottom: 10 }}>{a.text}</div>
              <div style={{
                background: V.surface2, borderLeft: `2px solid ${V.accent}`,
                padding: '8px 12px', borderRadius: '0 3px 3px 0', marginBottom: 10,
              }}>
                <div style={{ fontFamily: V.mono, fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.1em', color: V.accent, marginBottom: 3 }}>
                  Objetivo
                </div>
                <div style={{ fontSize: 11, color: V.text2, lineHeight: 1.5 }}>{a.objetivo}</div>
              </div>
            </div>

            <div style={{ padding: '0 14px 12px' }}>
              <button
                onClick={() => setDone(d => ({ ...d, [a.id]: !d[a.id] }))}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  width: '100%', padding: 9, borderRadius: 4, cursor: 'pointer',
                  fontFamily: V.ui, fontSize: 12, fontWeight: 600, border: 'none',
                  background: isDone ? V.accent : 'rgba(0,229,160,0.06)',
                  color: isDone ? '#000' : V.accent,
                  outline: isDone ? 'none' : `1px solid rgba(0,229,160,0.2)`,
                }}
              >
                <CheckIcon />
                {isDone ? 'Ação concluída' : 'Marcar como concluída'}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
