'use client'

import { useState, useRef, useEffect } from 'react'

const D = {
  bg:      '#0A0A0B',
  surface: '#111113',
  surface2:'#18181B',
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

export interface VendorFormData {
  id?: string
  nome: string
  email: string
  avatarUrl?: string | null
}

interface Props {
  open: boolean
  onClose: () => void
  vendor?: VendorFormData | null
  onSuccess: (updated: VendorFormData) => void
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  background: D.bg,
  border: `1px solid ${D.border2}`,
  borderRadius: 4,
  color: D.text1,
  fontFamily: D.ui,
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: D.mono,
  fontSize: 9,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.1em',
  color: D.text3,
  marginBottom: 6,
}

export function VendorFormModal({ open, onClose, vendor, onSuccess }: Props) {
  const isEdit = !!vendor?.id

  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setNome(vendor?.nome ?? '')
      setEmail(vendor?.email ?? '')
      setPassword('')
      setAvatarFile(null)
      setAvatarPreview(vendor?.avatarUrl ?? null)
      setError(null)
    }
  }, [open, vendor])

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setAvatarFile(f)
    setAvatarPreview(URL.createObjectURL(f))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      let vendorId = vendor?.id

      if (isEdit) {
        const body: Record<string, string> = {}
        if (nome !== vendor?.nome) body.nome = nome
        if (email !== vendor?.email) body.email = email
        if (password) body.password = password

        if (Object.keys(body).length > 0) {
          const res = await fetch(`/api/vendors/${vendorId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
          if (!res.ok) {
            const j = await res.json()
            throw new Error(j.error ?? 'Erro ao atualizar')
          }
        }
      } else {
        if (!password) throw new Error('Senha obrigatória para novo vendedor')
        const res = await fetch('/api/vendors', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nome, email, password }),
        })
        const j = await res.json()
        if (!res.ok) throw new Error(j.error ?? 'Erro ao criar')
        vendorId = j.id
      }

      let newAvatarUrl = vendor?.avatarUrl ?? null
      if (avatarFile && vendorId) {
        const fd = new FormData()
        fd.append('file', avatarFile)
        const res = await fetch(`/api/vendors/${vendorId}/avatar`, { method: 'POST', body: fd })
        const j = await res.json()
        if (!res.ok) throw new Error(j.error ?? 'Erro ao enviar foto')
        newAvatarUrl = j.signedUrl ?? null
      }

      onSuccess({ id: vendorId, nome, email, avatarUrl: newAvatarUrl })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  const initials = nome
    ? nome.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: D.surface, border: `1px solid ${D.border}`, borderRadius: 8, width: '100%', maxWidth: 460, fontFamily: D.ui }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: `1px solid ${D.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontFamily: D.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.12em', color: D.accent, marginBottom: 2 }}>
              {isEdit ? 'Editar' : 'Novo'} Vendedor
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: '-0.03em', color: D.text1 }}>
              {isEdit ? vendor?.nome : 'Cadastrar vendedor'}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: D.text3, cursor: 'pointer', fontSize: 18, padding: 4 }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: 24 }}>
          {/* Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
            <div
              onClick={() => fileRef.current?.click()}
              style={{ width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', background: 'rgba(0,229,160,0.1)', border: `2px solid ${D.border2}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, position: 'relative' }}
            >
              {avatarPreview
                ? <img src={avatarPreview} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span style={{ fontFamily: D.mono, fontSize: 16, fontWeight: 700, color: D.accent }}>{initials}</span>
              }
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: D.text1, marginBottom: 4 }}>Foto do perfil</div>
              <button type="button" onClick={() => fileRef.current?.click()} style={{ background: 'none', border: `1px solid ${D.border2}`, borderRadius: 4, padding: '5px 12px', color: D.text2, fontSize: 12, fontFamily: D.ui, cursor: 'pointer' }}>
                {avatarPreview ? 'Trocar foto' : 'Escolher foto'}
              </button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={labelStyle}>Nome completo</label>
              <input style={inputStyle} value={nome} onChange={e => setNome(e.target.value)} required placeholder="Nome do vendedor" />
            </div>
            <div>
              <label style={labelStyle}>E-mail</label>
              <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="email@empresa.com" />
            </div>
            <div>
              <label style={labelStyle}>{isEdit ? 'Nova senha (deixe em branco para manter)' : 'Senha inicial'}</label>
              <input style={inputStyle} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder={isEdit ? '••••••••' : 'Mínimo 6 caracteres'} minLength={isEdit ? undefined : 6} required={!isEdit} />
            </div>
          </div>

          {error && (
            <div style={{ marginTop: 16, padding: '8px 12px', background: 'rgba(255,68,85,0.08)', border: '1px solid rgba(255,68,85,0.2)', borderRadius: 4, color: D.red, fontSize: 12, fontFamily: D.mono }}>
              {error}
            </div>
          )}

          <div style={{ marginTop: 24, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '9px 20px', borderRadius: 4, border: `1px solid ${D.border2}`, background: 'transparent', color: D.text2, fontSize: 13, fontFamily: D.ui, cursor: 'pointer' }}>
              Cancelar
            </button>
            <button type="submit" disabled={loading} style={{ padding: '9px 24px', borderRadius: 4, border: 'none', background: loading ? D.border2 : D.accent, color: loading ? D.text3 : '#000', fontSize: 13, fontWeight: 700, fontFamily: D.ui, cursor: loading ? 'default' : 'pointer' }}>
              {loading ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar vendedor'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
