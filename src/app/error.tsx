'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const D = {
  bg:      '#0A0A0B',
  surface: '#111113',
  border:  '#1E1E22',
  border2: '#2A2A30',
  text1:   '#F0F0F4',
  text2:   '#8A8A96',
  text3:   '#4A4A56',
  accent:  '#00E5A0',
  red:     '#FF4455',
  mono:    "'JetBrains Mono', monospace",
  ui:      "'Space Grotesk', system-ui, sans-serif",
}

interface Props {
  error: Error & { digest?: string }
  reset: () => void
}

export default function GlobalError({ error, reset }: Props) {
  const pathname = usePathname()
  const dashboardHref = pathname?.startsWith('/vendor') ? '/vendor/dashboard' : '/dashboard'

  useEffect(() => {
    console.error('[Need Sales] Runtime error:', error)
  }, [error])

  return (
    <div style={{
      minHeight: '100vh',
      background: D.bg,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: D.ui,
      color: D.text1,
      padding: 24,
    }}>
      {/* Brand */}
      <div style={{
        fontFamily: D.mono,
        fontSize: 9,
        textTransform: 'uppercase',
        letterSpacing: '0.16em',
        color: D.accent,
        marginBottom: 40,
      }}>
        Need Sales
      </div>

      {/* Card */}
      <div style={{
        background: D.surface,
        border: `1px solid ${D.border}`,
        borderRadius: 8,
        padding: '48px 56px',
        textAlign: 'center',
        maxWidth: 480,
        width: '100%',
      }}>
        {/* Error badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 12px',
          background: 'rgba(255,68,85,0.08)',
          border: '1px solid rgba(255,68,85,0.2)',
          borderRadius: 20,
          marginBottom: 20,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: D.red, display: 'inline-block' }} />
          <span style={{ fontFamily: D.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: D.red }}>
            Algo deu errado
          </span>
        </div>

        <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.03em', color: D.text1, margin: '0 0 10px' }}>
          Erro inesperado
        </h1>

        <p style={{ fontSize: 13, color: D.text2, lineHeight: 1.6, margin: '0 0 24px' }}>
          Ocorreu um erro ao carregar esta página. Tente novamente ou volte para o início.
        </p>

        {/* Error code — only when available */}
        {error.digest && (
          <div style={{
            padding: '8px 12px',
            background: D.bg,
            border: `1px solid ${D.border2}`,
            borderRadius: 4,
            marginBottom: 24,
            fontFamily: D.mono,
            fontSize: 10,
            color: D.text3,
            letterSpacing: '0.06em',
          }}>
            código: {error.digest}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            onClick={reset}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '9px 20px', borderRadius: 4,
              background: D.accent, color: '#000',
              fontSize: 13, fontWeight: 700, fontFamily: D.ui,
              border: 'none', cursor: 'pointer',
            }}
          >
            ↺ Tentar novamente
          </button>
          <Link href={dashboardHref} style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '9px 20px', borderRadius: 4,
            border: `1px solid ${D.border2}`, background: 'transparent',
            color: D.text2, fontSize: 13, fontFamily: D.ui,
            textDecoration: 'none',
          }}>
            → Dashboard
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        marginTop: 32,
        fontFamily: D.mono,
        fontSize: 9,
        color: D.text3,
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
      }}>
        Need Sales — Análise Inteligente de Vendas
      </div>
    </div>
  )
}
