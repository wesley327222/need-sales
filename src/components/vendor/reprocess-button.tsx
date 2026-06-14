'use client'
import { useState } from 'react'
import { V } from './colors'

interface Props {
  meetingId: string
  tipo?: 'reuniao' | 'ligacao'
}

export function ReprocessButton({ meetingId, tipo = 'reuniao' }: Props) {
  const [state, setState] = useState<'idle' | 'running' | 'done' | 'error'>('idle')
  const [msg, setMsg] = useState('')

  async function handleClick() {
    setState('running')
    setMsg('Iniciando análise...')
    try {
      const res = await fetch(`/api/meetings/${meetingId}/process?tipo=${tipo}&force=1`, { method: 'POST' })
      const body = await res.json().catch(() => ({}))
      if (res.ok) {
        setState('done')
        setMsg('Análise concluída! Recarregando...')
        setTimeout(() => window.location.reload(), 1500)
      } else {
        setState('error')
        setMsg((body as { error?: string }).error ?? `Erro ${res.status}`)
      }
    } catch (e) {
      setState('error')
      setMsg(e instanceof Error ? e.message : 'Erro de rede')
    }
  }

  const color = state === 'done' ? V.accent : state === 'error' ? V.red : V.amber

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
      <button
        onClick={handleClick}
        disabled={state === 'running' || state === 'done'}
        style={{
          padding: '7px 14px', borderRadius: 4, fontFamily: V.mono, fontSize: 10,
          fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
          border: `1px solid ${color}`, color, background: 'transparent',
          cursor: state === 'running' || state === 'done' ? 'not-allowed' : 'pointer',
          opacity: state === 'running' ? 0.6 : 1,
        }}
      >
        {state === 'running' ? '⟳ Analisando...' : state === 'done' ? '✓ Concluído' : '↺ Reprocessar IA'}
      </button>
      {msg && (
        <span style={{ fontFamily: V.mono, fontSize: 9, color: state === 'error' ? V.red : V.text3 }}>
          {msg}
        </span>
      )}
    </div>
  )
}
