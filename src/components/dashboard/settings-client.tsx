'use client'

import { useState, useTransition, useEffect, useCallback } from 'react'

const D = {
  surface: '#111113', surface2: '#18181B',
  border: '#1E1E22', border2: '#2A2A30',
  text1: '#F0F0F4', text2: '#8A8A96', text3: '#4A4A56',
  accent: '#00E5A0', red: '#FF4455', amber: '#F59E0B',
  mono: "'JetBrains Mono', monospace", ui: "'Space Grotesk', system-ui, sans-serif",
}

const inpSt: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 4,
  border: `1px solid ${D.border2}`, background: D.surface2,
  color: D.text1, fontSize: 13, fontFamily: D.ui,
  outline: 'none', boxSizing: 'border-box',
}

const btnSt: React.CSSProperties = {
  padding: '9px 18px', background: D.accent, border: 'none',
  borderRadius: 4, color: '#000', fontFamily: D.ui,
  fontSize: 12, fontWeight: 700, cursor: 'pointer',
}

const NAV = [
  { key: 'perfil',      label: 'Perfil' },
  { key: 'empresa',     label: 'Empresa' },
  { key: 'equipe',      label: 'Equipe' },
  { key: 'ia',          label: 'Config. da IA' },
  { key: 'integracoes', label: 'Integrações' },
]

// ---- AI Config panel ----

const CRITERIOS_REUNIAO = [
  { key: 'escuta_ativa',     label: 'Escuta Ativa',            desc: 'Perguntas abertas, empatia, adaptação' },
  { key: 'quebra_objecoes',  label: 'Quebra de Objeções',      desc: 'Identificação e tratamento de objeções' },
  { key: 'apresentacao',     label: 'Apresentação do Produto',  desc: 'Clareza, benefícios, provas sociais' },
  { key: 'spin_selling',     label: 'SPIN Selling',             desc: 'Situação, Problema, Implicação, Necessidade' },
  { key: 'firmeza',          label: 'Firmeza / Assertividade',  desc: 'Postura segura, sem hesitação' },
  { key: 'rapport',          label: 'Rapport / Empatia',        desc: 'Conexão humana, clima de confiança' },
  { key: 'urgencia',         label: 'Criação de Urgência',      desc: 'Motivação para decisão rápida' },
]

const CRITERIOS_LIGACAO = [
  { key: 'acesso_decisor',      label: 'Acesso ao Decisor',      desc: 'Falar com quem decide a compra' },
  { key: 'explicacao_motivo',   label: 'Explicação do Motivo',   desc: 'Clareza na razão do contato' },
  { key: 'geracao_curiosidade', label: 'Geração de Curiosidade', desc: 'Despertar interesse real' },
  { key: 'conducao_conversa',   label: 'Condução da Conversa',   desc: 'Controle do diálogo' },
  { key: 'pedido_reuniao',      label: 'Pedido de Reunião',      desc: 'Tentativa de agendar próximo passo' },
  { key: 'firmeza',             label: 'Firmeza / Assertividade', desc: 'Tom seguro, postura de autoridade' },
  { key: 'tonalidade',          label: 'Tom de Voz / Confiança', desc: 'Ritmo, confiança, assertividade' },
]

const PESO_LABELS: Record<number, string> = { 1: 'Mínimo', 2: 'Baixo', 3: 'Médio', 4: 'Alto', 5: 'Máximo' }
const PESO_COLORS: Record<number, string> = { 1: '#4A4A56', 2: '#8A8A96', 3: '#F59E0B', 4: '#4F8EF7', 5: '#00E5A0' }

function Slider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <input
        type="range" min={1} max={5} step={1} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ flex: 1, accentColor: PESO_COLORS[value], cursor: 'pointer', height: 4 }}
      />
      <span style={{
        minWidth: 60, textAlign: 'center', fontFamily: D.mono, fontSize: 10, fontWeight: 700,
        padding: '3px 8px', borderRadius: 3, letterSpacing: '0.04em',
        background: `${PESO_COLORS[value]}18`,
        color: PESO_COLORS[value],
        border: `1px solid ${PESO_COLORS[value]}40`,
      }}>
        {value}/5 {PESO_LABELS[value]}
      </span>
    </div>
  )
}

type AiConfigState = { criterios: Record<string, number>; conhecimentos: string }
const defaultConfig = (): AiConfigState => ({ criterios: {}, conhecimentos: '' })

function AiConfigPanel() {
  const [tab,        setTab]        = useState<'reuniao' | 'ligacao'>('reuniao')
  const [reuniaoConf, setReuniaoConf] = useState<AiConfigState>(defaultConfig())
  const [ligacaoConf, setLigacaoConf] = useState<AiConfigState>(defaultConfig())
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [msg,        setMsg]        = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const load = useCallback(async (tipo: 'reuniao' | 'ligacao') => {
    try {
      const res = await fetch(`/api/ai-config?tipo=${tipo}`)
      const data = await res.json()
      if (!data) return
      const pesos: Record<string, number> = {}
      for (const [k, v] of Object.entries(data.criterios ?? {})) {
        pesos[k] = (v as { peso?: number }).peso ?? 3
      }
      const conf: AiConfigState = { criterios: pesos, conhecimentos: data.conhecimentos ?? '' }
      if (tipo === 'reuniao') setReuniaoConf(conf)
      else setLigacaoConf(conf)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    async function init() {
      setLoading(true)
      await Promise.all([load('reuniao'), load('ligacao')])
      setLoading(false)
    }
    init()
  }, [load])

  const criterios = tab === 'reuniao' ? CRITERIOS_REUNIAO : CRITERIOS_LIGACAO
  const conf = tab === 'reuniao' ? reuniaoConf : ligacaoConf
  const setConf = tab === 'reuniao' ? setReuniaoConf : setLigacaoConf

  function setPeso(key: string, val: number) {
    setConf(prev => ({ ...prev, criterios: { ...prev.criterios, [key]: val } }))
  }

  async function handleSave() {
    setSaving(true); setMsg(null)
    try {
      const criteriosPayload: Record<string, { peso: number }> = {}
      for (const c of criterios) {
        criteriosPayload[c.key] = { peso: conf.criterios[c.key] ?? 3 }
      }
      const res = await fetch('/api/ai-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: tab, criterios: criteriosPayload, conhecimentos: conf.conhecimentos }),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      setMsg({ type: 'ok', text: 'Configuração salva! Próximas análises usarão esses parâmetros.' })
    } catch {
      setMsg({ type: 'err', text: 'Erro ao salvar. Tente novamente.' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', fontFamily: D.mono, fontSize: 10, color: D.text3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
      Carregando configurações…
    </div>
  )

  return (
    <div>
      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: `1px solid ${D.border}` }}>
        {(['reuniao', 'ligacao'] as const).map(t => (
          <button key={t} onClick={() => { setTab(t); setMsg(null) }}
            style={{
              padding: '8px 18px', border: 'none', cursor: 'pointer', fontFamily: D.ui,
              fontSize: 12, fontWeight: tab === t ? 700 : 400,
              color: tab === t ? D.accent : D.text2,
              background: 'none',
              borderBottom: tab === t ? `2px solid ${D.accent}` : '2px solid transparent',
              marginBottom: -1,
            }}>
            {t === 'reuniao' ? '🎯 Reuniões' : '📞 Ligações'}
          </button>
        ))}
      </div>

      <StatusMsg msg={msg} />

      {/* Info callout */}
      <div style={{ padding: '10px 14px', background: 'rgba(0,229,160,0.04)', border: '1px solid rgba(0,229,160,0.12)', borderRadius: 4, marginBottom: 20, fontFamily: D.mono, fontSize: 10, color: D.accent, lineHeight: 1.7 }}>
        Configure os pesos (1=mínimo → 5=máximo) de cada critério. A IA vai dar mais ênfase aos critérios com peso maior ao gerar as notas e análises.
      </div>

      {/* Sliders */}
      <div style={{ fontFamily: D.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: D.text3, marginBottom: 12 }}>
        Peso dos Critérios
      </div>
      <div style={{ display: 'grid', gap: 10, marginBottom: 24 }}>
        {criterios.map(c => (
          <div key={c.key} style={{ background: D.surface2, border: `1px solid ${D.border2}`, borderRadius: 5, padding: '13px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: D.text1, marginBottom: 2 }}>{c.label}</div>
                <div style={{ fontSize: 11, color: D.text2 }}>{c.desc}</div>
              </div>
            </div>
            <Slider value={conf.criterios[c.key] ?? 3} onChange={v => setPeso(c.key, v)} />
          </div>
        ))}
      </div>

      {/* Knowledge base */}
      <div style={{ fontFamily: D.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: D.text3, marginBottom: 8 }}>
        Conhecimentos e Contexto para a IA
      </div>
      <div style={{ fontSize: 11, color: D.text2, marginBottom: 10, lineHeight: 1.6 }}>
        Adicione informações sobre o processo de vendas, produto, mercado, ICP ou comportamentos ideais do vendedor. A IA usará esse contexto para avaliar com mais precisão.
      </div>
      <textarea
        value={conf.conhecimentos}
        onChange={e => setConf(prev => ({ ...prev, conhecimentos: e.target.value }))}
        placeholder={tab === 'reuniao'
          ? 'Ex: Nossa solução é um SaaS de gestão para clínicas. O vendedor deve sempre mencionar o módulo de agendamento como diferencial. A reunião ideal dura 30min e termina com uma proposta clara. Nosso ICP são clínicas com 3+ médicos...'
          : 'Ex: Nossas ligações são de prospecção fria B2B. O decisor é sempre o sócio-proprietário ou gerente comercial. O objetivo é conseguir 15 minutos de reunião. Nunca fazer pitch completo na ligação — apenas despertar curiosidade...'}
        style={{
          ...inpSt, minHeight: 160, resize: 'vertical', fontFamily: D.ui,
          fontSize: 12, lineHeight: 1.65, padding: '12px',
        }}
      />

      <div style={{ marginTop: 16 }}>
        <button onClick={handleSave} disabled={saving} style={{
          ...btnSt, opacity: saving ? 0.6 : 1,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {saving ? 'Salvando…' : `Salvar Config. de ${tab === 'reuniao' ? 'Reuniões' : 'Ligações'}`}
        </button>
      </div>
    </div>
  )
}

export interface ProfileData {
  id: string
  nome: string
  email: string
  role: string
  created_at: string
}

export interface CompanyData {
  id: string
  nome: string
  descricao: string | null
  Produtos: string | null
  cnpj: string | null
}

export interface TeamMember {
  id: string
  nome: string
  email: string
  role: string
  created_at: string
  reunioes: number
  ligacoes: number
  avgScore: number | null
}

interface Props {
  profile: ProfileData | null
  company: CompanyData | null
  team: TeamMember[]
  saveProfile: (formData: FormData) => Promise<void>
  saveCompany: (formData: FormData) => Promise<void>
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        width: 36, height: 20, borderRadius: 10, position: 'relative', cursor: 'pointer', flexShrink: 0,
        background: checked ? D.accent : D.border2, transition: 'background 0.2s',
      }}
    >
      <div style={{
        position: 'absolute', top: 3, width: 14, height: 14, borderRadius: '50%',
        background: checked ? '#000' : D.text3,
        left: checked ? 19 : 3, transition: 'left 0.2s',
      }} />
    </div>
  )
}

function StatusMsg({ msg }: { msg: { type: 'ok' | 'err'; text: string } | null }) {
  if (!msg) return null
  return (
    <div style={{
      padding: '8px 12px', borderRadius: 4, marginBottom: 12,
      background: msg.type === 'ok' ? 'rgba(0,229,160,0.08)' : 'rgba(255,68,85,0.08)',
      border: `1px solid ${msg.type === 'ok' ? 'rgba(0,229,160,0.2)' : 'rgba(255,68,85,0.2)'}`,
      color: msg.type === 'ok' ? D.accent : D.red,
      fontFamily: D.mono, fontSize: 11,
    }}>
      {msg.type === 'ok' ? '✓ ' : '✗ '}{msg.text}
    </div>
  )
}

function scoreColor(s: number | null) {
  if (s == null) return D.text3
  if (s >= 7.5) return D.accent
  if (s >= 6)   return D.amber
  return D.red
}

export function SettingsClient({ profile, company, team, saveProfile, saveCompany }: Props) {
  const [active, setActive] = useState('perfil')
  const [profileMsg, setProfileMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [companyMsg, setCompanyMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [isPending, startTransition] = useTransition()
  const [notifs, setNotifs] = useState({ nova_analise: true, nota_baixa: true, followup: false, resumo: false })

  async function handleSaveProfile(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setProfileMsg(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        await saveProfile(fd)
        setProfileMsg({ type: 'ok', text: 'Perfil salvo com sucesso!' })
      } catch {
        setProfileMsg({ type: 'err', text: 'Erro ao salvar. Tente novamente.' })
      }
    })
  }

  async function handleSaveCompany(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setCompanyMsg(null)
    const fd = new FormData(e.currentTarget)
    startTransition(async () => {
      try {
        await saveCompany(fd)
        setCompanyMsg({ type: 'ok', text: 'Empresa salva com sucesso!' })
      } catch {
        setCompanyMsg({ type: 'err', text: 'Erro ao salvar. Tente novamente.' })
      }
    })
  }

  const PANELS: Record<string, React.ReactNode> = {
    perfil: (
      <form onSubmit={handleSaveProfile}>
        <div style={{ fontFamily: D.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: D.text3, marginBottom: 16 }}>Meu Perfil</div>
        <StatusMsg msg={profileMsg} />
        <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'Nome Completo', name: 'nome',  defaultValue: profile?.nome ?? '', type: 'text' },
            { label: 'Email',         name: 'email', defaultValue: profile?.email ?? '', type: 'email' },
          ].map(f => (
            <div key={f.name}>
              <div style={{ fontFamily: D.mono, fontSize: 9, color: D.text3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{f.label}</div>
              <input type={f.type} name={f.name} defaultValue={f.defaultValue} style={inpSt} />
            </div>
          ))}
          <div>
            <div style={{ fontFamily: D.mono, fontSize: 9, color: D.text3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Função</div>
            <div style={{ padding: '9px 12px', borderRadius: 4, border: `1px solid ${D.border2}`, background: D.surface2, color: D.text3, fontSize: 12, fontFamily: D.mono }}>
              {profile?.role === 'manager' ? 'Gestor' : profile?.role === 'admin' ? 'Admin' : profile?.role ?? '—'}
            </div>
          </div>
          <div>
            <div style={{ fontFamily: D.mono, fontSize: 9, color: D.text3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Membro desde</div>
            <div style={{ padding: '9px 12px', borderRadius: 4, border: `1px solid ${D.border2}`, background: D.surface2, color: D.text3, fontSize: 12, fontFamily: D.mono }}>
              {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('pt-BR') : '—'}
            </div>
          </div>
        </div>
        <button type="submit" style={{ ...btnSt, opacity: isPending ? 0.6 : 1 }} disabled={isPending}>
          {isPending ? 'Salvando…' : 'Salvar Perfil'}
        </button>
      </form>
    ),

    empresa: (
      <form onSubmit={handleSaveCompany}>
        <div style={{ fontFamily: D.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: D.text3, marginBottom: 16 }}>Informações da Empresa</div>
        <StatusMsg msg={companyMsg} />
        {!company ? (
          <div style={{ padding: '24px', background: D.surface2, borderRadius: 5, border: `1px solid ${D.border2}`, color: D.text3, fontFamily: D.mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', textAlign: 'center' }}>
            Empresa não vinculada ao perfil
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gap: 12, marginBottom: 20 }}>
              {[
                { label: 'Nome da Empresa', name: 'nome',      defaultValue: company.nome ?? '', type: 'text' },
                { label: 'CNPJ',            name: 'cnpj',      defaultValue: company.cnpj ?? '', type: 'text' },
                { label: 'Descrição',       name: 'descricao', defaultValue: company.descricao ?? '', type: 'text' },
                { label: 'Produtos/Serviços', name: 'produtos', defaultValue: company.Produtos ?? '', type: 'text' },
              ].map(f => (
                <div key={f.name}>
                  <div style={{ fontFamily: D.mono, fontSize: 9, color: D.text3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{f.label}</div>
                  <input type={f.type} name={f.name} defaultValue={f.defaultValue} style={inpSt} />
                </div>
              ))}
            </div>
            <button type="submit" style={{ ...btnSt, opacity: isPending ? 0.6 : 1 }} disabled={isPending}>
              {isPending ? 'Salvando…' : 'Salvar Empresa'}
            </button>
          </>
        )}
      </form>
    ),

    equipe: (
      <div>
        <div style={{ fontFamily: D.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: D.text3, marginBottom: 16 }}>Membros da Equipe</div>
        {team.length === 0 ? (
          <div style={{ background: D.surface2, border: `1px solid ${D.border2}`, borderRadius: 5, padding: 32, textAlign: 'center', fontFamily: D.mono, fontSize: 10, color: D.text3, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
            Nenhum membro cadastrado ainda
          </div>
        ) : (
          <div style={{ background: D.surface2, border: `1px solid ${D.border2}`, borderRadius: 5, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Nome', 'Email', 'Função', 'Reuniões', 'Ligações', 'Nota Média'].map(h => (
                    <th key={h} style={{ fontFamily: D.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: D.text3, fontWeight: 500, textAlign: 'left', padding: '9px 14px', borderBottom: `1px solid ${D.border}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {team.map(m => (
                  <tr key={m.id}>
                    <td style={{ padding: '11px 14px', borderBottom: `1px solid ${D.border}`, fontSize: 13, fontWeight: 600, color: D.text1 }}>{m.nome}</td>
                    <td style={{ padding: '11px 14px', borderBottom: `1px solid ${D.border}`, fontFamily: D.mono, fontSize: 11, color: D.text2 }}>{m.email}</td>
                    <td style={{ padding: '11px 14px', borderBottom: `1px solid ${D.border}` }}>
                      <span style={{ display: 'inline-block', padding: '3px 8px', borderRadius: 3, fontFamily: D.mono, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', background: m.role === 'seller' ? 'rgba(79,142,247,0.1)' : 'rgba(0,229,160,0.08)', color: m.role === 'seller' ? D.text2 : D.accent, border: `1px solid ${m.role === 'seller' ? D.border2 : 'rgba(0,229,160,0.2)'}` }}>
                        {m.role === 'seller' ? 'Vendedor' : m.role === 'manager' ? 'Gestor' : m.role}
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px', borderBottom: `1px solid ${D.border}`, fontFamily: D.mono, fontSize: 12, color: D.text2 }}>{m.reunioes}</td>
                    <td style={{ padding: '11px 14px', borderBottom: `1px solid ${D.border}`, fontFamily: D.mono, fontSize: 12, color: D.text2 }}>{m.ligacoes}</td>
                    <td style={{ padding: '11px 14px', borderBottom: `1px solid ${D.border}`, fontFamily: D.mono, fontSize: 15, fontWeight: 700, color: scoreColor(m.avgScore) }}>
                      {m.avgScore != null ? m.avgScore.toFixed(1) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{ marginTop: 14, padding: '12px 14px', background: 'rgba(0,229,160,0.04)', border: '1px solid rgba(0,229,160,0.12)', borderRadius: 4, fontFamily: D.mono, fontSize: 10, color: D.text3, lineHeight: 1.6 }}>
          Para convidar novos membros, envie o link de cadastro e defina o papel (gestor ou vendedor) no painel Supabase.
        </div>
      </div>
    ),

    ia: <AiConfigPanel />,

    integracoes: (
      <div>
        <div style={{ fontFamily: D.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: D.text3, marginBottom: 16 }}>Integrações Ativas</div>
        <div style={{ display: 'grid', gap: 10 }}>
          {[
            { name: 'Supabase',             desc: 'Banco de dados e autenticação',      status: 'connected' },
            { name: 'Gladia AI',            desc: 'Transcrição de áudio via IA',        status: 'connected' },
            { name: 'OpenAI / Anthropic',   desc: 'Análise e geração de insights',      status: 'connected' },
            { name: 'WhatsApp Business',    desc: 'Envio automático de follow-ups',     status: 'pending' },
            { name: 'HubSpot CRM',          desc: 'Sincronização de contatos e deals',  status: 'pending' },
          ].map(intg => (
            <div key={intg.name} style={{ background: D.surface2, border: `1px solid ${D.border2}`, borderRadius: 5, padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: D.text1, marginBottom: 2 }}>{intg.name}</div>
                <div style={{ fontSize: 11, color: D.text2 }}>{intg.desc}</div>
              </div>
              <span style={{
                padding: '3px 10px', borderRadius: 3,
                fontFamily: D.mono, fontSize: 9, fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.06em',
                background: intg.status === 'connected' ? 'rgba(0,229,160,0.08)' : 'rgba(245,158,11,0.08)',
                color: intg.status === 'connected' ? D.accent : D.amber,
                border: `1px solid ${intg.status === 'connected' ? 'rgba(0,229,160,0.2)' : 'rgba(245,158,11,0.2)'}`,
              }}>
                {intg.status === 'connected' ? 'Conectado' : 'Em breve'}
              </span>
            </div>
          ))}
        </div>
      </div>
    ),
  }

  return (
    <div style={{ padding: '0 32px 40px', display: 'flex', gap: 20, alignItems: 'flex-start' }}>
      {/* Settings nav */}
      <div style={{ width: 200, flexShrink: 0, background: D.surface, border: `1px solid ${D.border}`, borderRadius: 6, overflow: 'hidden' }}>
        {NAV.map(item => (
          <button key={item.key} onClick={() => setActive(item.key)}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '11px 16px', border: 'none', cursor: 'pointer',
              fontFamily: D.ui, fontSize: 13, fontWeight: active === item.key ? 600 : 400,
              background: active === item.key ? 'rgba(0,229,160,0.08)' : 'transparent',
              color: active === item.key ? D.accent : D.text2,
              borderLeft: active === item.key ? `2px solid ${D.accent}` : '2px solid transparent',
            }}>
            {item.label}
          </button>
        ))}
      </div>

      {/* Panel */}
      <div style={{ flex: 1, background: D.surface, border: `1px solid ${D.border}`, borderRadius: 6, padding: '24px' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: D.text1, marginBottom: 20 }}>
          {NAV.find(n => n.key === active)?.label}
        </div>
        {PANELS[active]}
      </div>
    </div>
  )
}
