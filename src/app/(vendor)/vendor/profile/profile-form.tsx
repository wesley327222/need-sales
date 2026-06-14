'use client'

import { useState, useRef } from 'react'
import { V } from '@/components/vendor/colors'

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  background: '#0A0A0B',
  border: '1px solid #2A2A30',
  borderRadius: 4,
  color: V.text1,
  fontFamily: V.ui,
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: V.mono,
  fontSize: 9,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.1em',
  color: V.text3,
  marginBottom: 6,
}

interface Props {
  id: string
  nome: string
  email: string
  avatarUrl: string | null
}

export function VendorProfileForm({ id, nome: initialNome, email: initialEmail, avatarUrl: initialAvatar }: Props) {
  const [nome, setNome] = useState(initialNome)
  const [email, setEmail] = useState(initialEmail)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(initialAvatar)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const initials = nome
    ? nome.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setAvatarFile(f)
    setAvatarPreview(URL.createObjectURL(f))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (password && password !== confirmPassword) {
      setError('As senhas não coincidem')
      return
    }
    if (password && password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres')
      return
    }

    setLoading(true)
    try {
      const body: Record<string, string> = {}
      if (nome !== initialNome) body.nome = nome
      if (email !== initialEmail) body.email = email
      if (password) body.password = password

      if (Object.keys(body).length > 0) {
        const res = await fetch(`/api/vendors/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const j = await res.json()
          throw new Error(j.error ?? 'Erro ao salvar')
        }
      }

      if (avatarFile) {
        const fd = new FormData()
        fd.append('file', avatarFile)
        const res = await fetch(`/api/vendors/${id}/avatar`, { method: 'POST', body: fd })
        if (!res.ok) {
          const j = await res.json()
          throw new Error(j.error ?? 'Erro ao enviar foto')
        }
      }

      setPassword('')
      setConfirmPassword('')
      setAvatarFile(null)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ fontFamily: V.ui, color: V.text1, maxWidth: 560 }}>
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontFamily: V.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em', color: V.accent, marginBottom: 4 }}>
          Minha Conta
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.04em', color: V.text1, margin: '0 0 4px' }}>Perfil</h1>
        <p style={{ fontSize: 13, color: V.text2, margin: 0 }}>Atualize suas informações de acesso e foto de perfil.</p>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Avatar section */}
        <div style={{ background: V.surface, border: `1px solid ${V.border}`, borderRadius: 8, padding: 24, marginBottom: 16 }}>
          <div style={{ fontFamily: V.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: V.text3, marginBottom: 16 }}>Foto de Perfil</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div
              onClick={() => fileRef.current?.click()}
              style={{ width: 72, height: 72, borderRadius: '50%', overflow: 'hidden', background: 'rgba(0,229,160,0.1)', border: `2px solid ${V.border2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}
            >
              {avatarPreview
                ? <img src={avatarPreview} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontFamily: V.mono, fontSize: 18, fontWeight: 700, color: V.accent }}>{initials}</span>
              }
            </div>
            <div>
              <button type="button" onClick={() => fileRef.current?.click()} style={{ display: 'block', marginBottom: 6, padding: '7px 16px', borderRadius: 4, border: `1px solid ${V.border2}`, background: 'transparent', color: V.text2, fontSize: 12, fontFamily: V.ui, cursor: 'pointer' }}>
                {avatarPreview ? 'Trocar foto' : 'Escolher foto'}
              </button>
              <div style={{ fontSize: 11, color: V.text3, fontFamily: V.mono }}>JPG, PNG ou GIF. Máx 5MB.</div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
          </div>
        </div>

        {/* Info section */}
        <div style={{ background: V.surface, border: `1px solid ${V.border}`, borderRadius: 8, padding: 24, marginBottom: 16 }}>
          <div style={{ fontFamily: V.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: V.text3, marginBottom: 16 }}>Informações Pessoais</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>Nome completo</label>
              <input style={inputStyle} value={nome} onChange={e => setNome(e.target.value)} required />
            </div>
            <div>
              <label style={labelStyle}>E-mail</label>
              <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
          </div>
        </div>

        {/* Password section */}
        <div style={{ background: V.surface, border: `1px solid ${V.border}`, borderRadius: 8, padding: 24, marginBottom: 24 }}>
          <div style={{ fontFamily: V.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: V.text3, marginBottom: 16 }}>Alterar Senha</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={labelStyle}>Nova senha</label>
              <input style={inputStyle} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Deixe em branco para manter" />
            </div>
            <div>
              <label style={labelStyle}>Confirmar nova senha</label>
              <input style={inputStyle} type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repita a nova senha" />
            </div>
          </div>
        </div>

        {error && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(255,68,85,0.08)', border: '1px solid rgba(255,68,85,0.2)', borderRadius: 4, color: '#FF4455', fontSize: 12, fontFamily: V.mono }}>
            {error}
          </div>
        )}

        {success && (
          <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(0,229,160,0.08)', border: '1px solid rgba(0,229,160,0.2)', borderRadius: 4, color: V.accent, fontSize: 12, fontFamily: V.mono }}>
            Perfil atualizado com sucesso!
          </div>
        )}

        <button type="submit" disabled={loading} style={{ padding: '10px 28px', borderRadius: 4, border: 'none', background: loading ? V.border2 : V.accent, color: loading ? V.text3 : '#000', fontSize: 13, fontWeight: 700, fontFamily: V.ui, cursor: loading ? 'default' : 'pointer' }}>
          {loading ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </form>
    </div>
  )
}
