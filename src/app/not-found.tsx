import Link from 'next/link'

const D = {
  bg:      '#0A0A0B',
  surface: '#111113',
  border:  '#1E1E22',
  border2: '#2A2A30',
  text1:   '#F0F0F4',
  text2:   '#8A8A96',
  text3:   '#4A4A56',
  accent:  '#00E5A0',
  mono:    "'JetBrains Mono', monospace",
  ui:      "'Space Grotesk', system-ui, sans-serif",
}

export default function NotFound() {
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
        {/* Icon / code */}
        <div style={{
          fontFamily: D.mono,
          fontSize: 72,
          fontWeight: 700,
          letterSpacing: '-0.06em',
          lineHeight: 1,
          color: D.border2,
          marginBottom: 24,
          userSelect: 'none',
        }}>
          404
        </div>

        {/* Animated build indicator */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 12px',
          background: `${D.accent}10`,
          border: `1px solid ${D.accent}30`,
          borderRadius: 20,
          marginBottom: 20,
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: D.accent, display: 'inline-block' }} />
          <span style={{ fontFamily: D.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: D.accent }}>
            Página em construção
          </span>
        </div>

        <h1 style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-0.03em', color: D.text1, margin: '0 0 10px' }}>
          Esta tela ainda não existe
        </h1>

        <p style={{ fontSize: 13, color: D.text2, lineHeight: 1.6, margin: '0 0 32px' }}>
          O endereço que você acessou não está disponível ou está sendo desenvolvido.
          Volte para a área que conhece ou aguarde novas atualizações.
        </p>

        {/* Progress bar — decorative */}
        <div style={{ height: 2, background: D.border, borderRadius: 1, marginBottom: 32, overflow: 'hidden' }}>
          <div style={{
            width: '60%',
            height: 2,
            background: `linear-gradient(90deg, ${D.accent}00, ${D.accent}, ${D.accent}00)`,
            borderRadius: 1,
          }} />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <Link href="/dashboard" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '9px 20px', borderRadius: 4,
            background: D.accent, color: '#000',
            fontSize: 13, fontWeight: 700, fontFamily: D.ui,
            textDecoration: 'none',
          }}>
            → Dashboard
          </Link>
          <Link href="javascript:history.back()" style={{
            display: 'inline-flex', alignItems: 'center',
            padding: '9px 20px', borderRadius: 4,
            border: `1px solid ${D.border2}`, background: 'transparent',
            color: D.text2, fontSize: 13, fontFamily: D.ui,
            textDecoration: 'none',
          }}>
            Voltar
          </Link>
        </div>
      </div>

      {/* Footer hint */}
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
