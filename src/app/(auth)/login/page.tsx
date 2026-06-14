'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { V } from '@/components/vendor/colors'

const FEATURES_SELLER = [
  { icon: '📊', title: 'Minha Performance', desc: 'Acompanhe suas notas e evolução em tempo real com análise criteriosa de cada reunião.' },
  { icon: '🎯', title: 'Ações Recomendadas', desc: 'Receba sugestões personalizadas da IA para melhorar suas habilidades de vendas.' },
  { icon: '📁', title: 'Minhas Reuniões & Ligações', desc: 'Acesse transcrições, insights e follow-ups gerados automaticamente para cada interação.' },
]

const FEATURES_MANAGER = [
  { icon: '👥', title: 'Gestão de Equipe', desc: 'Visualize o desempenho de toda a equipe com rankings e métricas consolidadas em tempo real.' },
  { icon: '📈', title: 'Relatórios & Análises', desc: 'Acompanhe tendências, evolução mensal e critérios de avaliação de cada vendedor.' },
  { icon: '🤖', title: 'Insights de IA', desc: 'Receba recomendações automáticas para coaching e desenvolvimento da sua equipe.' },
]

const inp: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 5,
  border: `1px solid ${V.border2}`, background: V.surface2,
  color: V.text1, fontSize: 14, fontFamily: V.ui,
  outline: 'none', boxSizing: 'border-box',
}

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [role, setRole] = useState<'seller' | 'manager'>('seller')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const FEATURES = role === 'seller' ? FEATURES_SELLER : FEATURES_MANAGER

  async function handleLogin(e?: React.FormEvent) {
    e?.preventDefault()
    setLoading(true)
    setError(null)

    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password })

    if (authErr) {
      setError(authErr.message === 'Invalid login credentials'
        ? 'Email ou senha incorretos'
        : authErr.message)
      setLoading(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    const { data: profile } = user
      ? await supabase.from('profiles').select('role').eq('id', user.id).single()
      : { data: null }

    router.push(profile?.role === 'seller' ? '/vendor/dashboard' : '/dashboard')
    router.refresh()
  }

  return (
    <div style={{
      display: 'flex', height: '100vh', fontFamily: V.ui,
      background: V.bg, color: V.text1, overflow: 'hidden',
    }}>
      {/* ── Left brand panel ── */}
      <div style={{
        width: '42%', background: V.surface, borderRight: `1px solid ${V.border}`,
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        padding: '48px 48px', position: 'relative', overflow: 'hidden',
      }}>
        {/* radial gradient glow */}
        <div style={{
          position: 'absolute', bottom: -100, left: -100,
          width: 500, height: 500, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,229,160,0.07) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 5, background: V.accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M4 6h16M4 11h10M4 16h7" stroke="#000" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: '-0.03em' }}>
            Need<span style={{ color: V.accent }}>Sales</span>
          </span>
        </div>

        {/* Headline */}
        <h1 style={{
          fontSize: 28, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1.2, marginBottom: 36,
        }}>
          {role === 'seller' ? (
            <>Sua performance.<br />Seus dados.<br /><span style={{ color: V.accent }}>Seu crescimento.</span></>
          ) : (
            <>Sua equipe.<br />Seus números.<br /><span style={{ color: V.accent }}>Seus resultados.</span></>
          )}
        </h1>

        {/* Feature cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{
              background: V.surface2, border: `1px solid ${V.border}`,
              borderRadius: 5, padding: '14px 16px',
              display: 'flex', gap: 12, alignItems: 'flex-start',
            }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{f.icon}</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 3 }}>{f.title}</div>
                <div style={{ fontSize: 11.5, color: V.text2, lineHeight: 1.5 }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center', padding: 48,
      }}>
        <div style={{ width: '100%', maxWidth: 360 }}>
          {/* Logo (small repeat) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 32 }}>
            <div style={{
              width: 22, height: 22, borderRadius: 4, background: V.accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
                <path d="M4 6h16M4 11h10M4 16h7" stroke="#000" strokeWidth="2.5" strokeLinecap="round"/>
              </svg>
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: '-0.03em' }}>
              Need<span style={{ color: V.accent }}>Sales</span>
            </span>
          </div>

          {/* Role toggle */}
          <div style={{
            display: 'flex', background: V.surface2, border: `1px solid ${V.border}`,
            borderRadius: 6, padding: 3, marginBottom: 28, gap: 3,
          }}>
            {(['seller', 'manager'] as const).map(r => (
              <button
                key={r}
                type="button"
                onClick={() => { setRole(r); setError(null) }}
                style={{
                  flex: 1, padding: '8px 12px', borderRadius: 4, border: 'none',
                  background: role === r ? V.surface : 'transparent',
                  color: role === r ? V.text1 : V.text3,
                  fontSize: 12.5, fontWeight: role === r ? 700 : 400,
                  fontFamily: V.ui, cursor: 'pointer',
                  boxShadow: role === r ? `0 1px 3px rgba(0,0,0,0.3)` : 'none',
                  transition: 'all 0.15s',
                  letterSpacing: '-0.01em',
                }}
              >
                {r === 'seller' ? '👤 Vendedor' : '👑 Gestor'}
              </button>
            ))}
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 6 }}>
            {role === 'seller' ? 'Portal do Vendedor' : 'Portal do Gestor'}
          </h2>
          <p style={{ fontSize: 12.5, color: V.text2, marginBottom: 28 }}>
            {role === 'seller' ? 'Acesse sua conta para ver sua performance' : 'Acesse sua conta para gerenciar sua equipe'}
          </p>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontFamily: V.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: V.text3, marginBottom: 6 }}>
                Email
              </label>
              <input
                type="email"
                placeholder="seu@email.com.br"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                style={inp}
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontFamily: V.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: V.text3, marginBottom: 6 }}>
                Senha
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                style={inp}
              />
            </div>

            {error && (
              <div style={{
                marginBottom: 16, padding: '9px 12px', borderRadius: 4,
                background: 'rgba(255,68,85,0.08)', border: '1px solid rgba(255,68,85,0.2)',
                fontSize: 12, color: '#FF4455',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '11px', borderRadius: 5, border: 'none',
                background: loading ? V.text3 : V.accent, color: '#000',
                fontSize: 14, fontWeight: 700, fontFamily: V.ui, cursor: loading ? 'default' : 'pointer',
                letterSpacing: '-0.01em',
              }}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <div style={{ marginTop: 24, textAlign: 'center' }}>
            <span style={{ fontFamily: V.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: V.text3 }}>
              O acesso é definido pelo seu perfil cadastrado
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
