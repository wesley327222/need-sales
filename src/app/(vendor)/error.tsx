'use client'

import { useEffect } from 'react'
import Link from 'next/link'

const V = {
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

/**
 * Boundary de erro próprio do Portal do Vendedor — captura erros antes que
 * subam para o error.tsx global, garantindo que o vendedor nunca seja
 * direcionado para fora do seu portal ao se recuperar de um erro.
 */
export default function VendorError({ error, reset }: Props) {
  useEffect(() => {
    console.error('[Need Sales] Erro no Portal do Vendedor:', error)
  }, [error])

  return (
    <div style={{
      minHeight: '100vh',
      background: V.bg,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: V.ui,
      color: V.text1,
      padding: 24,
    }}>
      <div style={{
        fontFamily: V.mono, fontSize: 9, textTransform: 'uppercase',
        letterSpacing: '0.16em', color: V.accent, marginBottom: 40,
      }}>
        Need Sales — Portal do Vendedor
      </div>

      <div style={{
        background: V.surface, border: `1px solid ${V.border}`, borderRadius: 8,
        padding: '48px 56px', textAlign: 'center', maxWidth: 480, width: '100%',
      }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 12px', background: 'rgba(255,68,85,0.08)',
          border: '1px solid rgba(255,68,85,0.2)', borderRadius: 20, marginBottom: 20,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: V.red, display: 'inline-block' }} />
          <span style={{ fontFamily: V.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: V.red }}>
            Algo deu errado
          </span>
        </div>

        <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.03em', color: V.text1, margin: '0 0 10px' }}>
          Erro inesperado
        </h1>

        <p style={{ fontSize: 13, color: V.text2, lineHeight: 1.6, margin: '0 0 24px' }}>
          Ocorreu um erro ao carregar esta página. Tente novamente ou volte para o seu painel.
        </p>

        {error.digest && (
          <div style={{
            padding: '8px 12px', background: V.bg, border: `1px solid ${V.border2}`,
            borderRadius: 4, marginBottom: 24, fontFamily: V.mono, fontSize: 10,
            color: V.text3, letterSpacing: '0.06em',
          }}>
            código: {error.digest}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button
            onClick={reset}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '9px 20px', borderRadius: 4,
              background: V.accent, color: '#000',
              fontSize: 13, fontWeight: 700, fontFamily: V.ui,
              border: 'none', cursor: 'pointer',
            }}
          >
            ↺ Tentar novamente
          </button>
          <Link href="/vendor/dashboard" style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '9px 20px', borderRadius: 4,
            border: `1px solid ${V.border2}`, background: 'transparent',
            color: V.text2, fontSize: 13, fontFamily: V.ui,
            textDecoration: 'none',
          }}>
            → Meu Painel
          </Link>
        </div>
      </div>

      <div style={{
        marginTop: 32, fontFamily: V.mono, fontSize: 9, color: V.text3,
        letterSpacing: '0.08em', textTransform: 'uppercase',
      }}>
        Need Sales — Análise Inteligente de Vendas
      </div>
    </div>
  )
}
