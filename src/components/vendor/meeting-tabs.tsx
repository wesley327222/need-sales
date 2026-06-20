'use client'

import { useState } from 'react'
import { V, scoreColor, fmtScore } from './colors'

interface NotaRelatorio {
  valor: number
  justificativa: string
  evidencias: string[]
  sugestoes: string[]
}

interface SpinDim {
  score: number
  evidencias: string[]
  justificativa: string
  sugestoes: string[]
}

// Critério dinâmico (modelo novo) — autodescritivo, vem de `criterios_resultado` no banco
export interface CriterioResultadoDisplay {
  key: string
  label: string
  obrigatorio: boolean
  nota: number
  justificativa: string
  evidencias: string[]
  sugestoes: string[]
  objecoes?: { numero: number; texto: string; status: string; como_tratou: string; sugestao_quebra: string }[]
  spinBreakdown?: { S: SpinDim; P: SpinDim; I: SpinDim; N: SpinDim }
}

export interface MeetingTabData {
  transcription: string | null
  duration_seconds: number | null
  insights: {
    positivos: string[]
    melhorias: string[]
  } | null
  objecoes: {
    numero: number
    texto: string
    status: string
    como_tratou: string | null
    sugestao_quebra: string | null
  }[]
  followups: {
    canal: string
    timing: string
    assunto: string | null
    mensagem: string
  }[]
  // Modelo novo (critérios dinâmicos) — quando presente, tem prioridade na aba "Relatório das Notas"
  criteriosResultado: CriterioResultadoDisplay[] | null
  // Modelo antigo (critérios fixos) — usado como fallback para registros analisados antes da personalização
  relatorioNotas: {
    escuta: NotaRelatorio | null
    objecoes_nota: NotaRelatorio | null
    apresentacao: NotaRelatorio | null
  } | null
  spin: {
    score: number
    S: SpinDim
    P: SpinDim
    I: SpinDim
    N: SpinDim
  } | null
  proposta: string | null
}

const TABS = [
  { key: 'transcricao', label: 'Áudio & Transcrição' },
  { key: 'insights',    label: 'Insights' },
  { key: 'objecoes',   label: 'Objeções' },
  { key: 'followups',  label: 'Follow-ups' },
  { key: 'relatorio',  label: 'Relatório das Notas' },
  { key: 'email',      label: 'Email' },
  { key: 'proposta',   label: 'Proposta' },
]

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 10px',
        borderRadius: 3, border: `1px solid ${copied ? 'rgba(0,229,160,0.3)' : V.border2}`,
        background: copied ? 'rgba(0,229,160,0.08)' : V.surface2,
        color: copied ? V.accent : V.text2, fontSize: 10, fontFamily: V.mono,
        cursor: 'pointer', letterSpacing: '0.04em', textTransform: 'uppercase',
      }}
    >
      {copied ? '✓ COPIADO' : '⎘ Copiar'}
    </button>
  )
}

function fmtDuration(s: number | null) {
  if (!s) return '—'
  const m = Math.floor(s / 60), sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function NotaCard({ title, nota, color, badge }: { title: string; nota: NotaRelatorio | null; color?: string; badge?: string }) {
  const titleNode = (
    <span style={{ fontFamily: V.mono, fontSize: 11, fontWeight: 700, color: V.text1, letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: 8 }}>
      {title}
      {badge && (
        <span style={{
          fontFamily: V.mono, fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
          padding: '2px 7px', borderRadius: 3, background: 'rgba(0,229,160,0.1)', color: V.accent,
          border: '1px solid rgba(0,229,160,0.2)',
        }}>
          {badge}
        </span>
      )}
    </span>
  )

  if (!nota) return (
    <div style={{ background: V.surface, border: `1px solid ${V.border}`, borderRadius: 5, overflow: 'hidden', marginBottom: 12 }}>
      <div style={{ padding: '11px 16px', background: V.surface2 }}>
        {titleNode}
      </div>
      <div style={{ padding: '13px 16px', fontSize: 12, color: V.text3 }}>Dados não disponíveis</div>
    </div>
  )
  return (
    <div style={{ background: V.surface, border: `1px solid ${V.border}`, borderRadius: 5, overflow: 'hidden', marginBottom: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', borderBottom: `1px solid ${V.border}`, background: V.surface2 }}>
        {titleNode}
        <span style={{ fontFamily: V.mono, fontSize: 16, fontWeight: 700, letterSpacing: '-0.03em', color: color ?? scoreColor(nota.valor) }}>
          {nota.valor.toFixed(1)} /10
        </span>
      </div>
      <div style={{ padding: 16 }}>
        <div style={{ fontFamily: V.mono, fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.08em', color: V.text3, marginBottom: 5 }}>Justificativa</div>
        <div style={{ fontSize: 12.5, color: V.text1, lineHeight: 1.65, marginBottom: 12 }}>{nota.justificativa}</div>
        {nota.evidencias.length > 0 && (
          <>
            <div style={{ fontFamily: V.mono, fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.08em', color: V.text3, marginBottom: 6 }}>Evidências da Call</div>
            {nota.evidencias.map((e, i) => (
              <div key={i} style={{ fontSize: 11.5, color: V.text2, lineHeight: 1.6, background: V.surface2, borderLeft: `2px solid ${V.border2}`, padding: '6px 10px', marginBottom: 5, borderRadius: '0 3px 3px 0', fontStyle: 'italic' }}>{e}</div>
            ))}
          </>
        )}
        {nota.sugestoes.length > 0 && (
          <>
            <div style={{ fontFamily: V.mono, fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.08em', color: V.text3, marginBottom: 6, marginTop: 12 }}>Sugestões de Melhoria</div>
            {nota.sugestoes.map((s, i) => (
              <div key={i} style={{ fontSize: 11.5, color: V.accent, lineHeight: 1.6, marginBottom: 4 }}>→ {s}</div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

function SpinBreakdownCard({ title, score }: { title: string; score: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', borderBottom: `1px solid ${V.border}`, background: V.surface2 }}>
      <span style={{ fontFamily: V.mono, fontSize: 11, fontWeight: 700, color: V.text1, letterSpacing: '0.04em' }}>{title}</span>
      <span style={{ fontFamily: V.mono, fontSize: 16, fontWeight: 700, letterSpacing: '-0.03em', color: scoreColor(score) }}>
        {score.toFixed(1)} /10
      </span>
    </div>
  )
}

function SpinGrid({ S, P, I, N }: { S: SpinDim; P: SpinDim; I: SpinDim; N: SpinDim }) {
  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {([
          { key: 'S', label: 'S — Situação', item: S },
          { key: 'P', label: 'P — Problema', item: P },
          { key: 'I', label: 'I — Implicação', item: I },
          { key: 'N', label: 'N — Necessidade', item: N },
        ] as const).map(({ key, label, item }) => (
          <div key={key} style={{ background: V.bg, border: `1px solid ${V.border}`, borderRadius: 4, padding: '11px 13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: V.text1 }}>{label}</span>
              <span style={{ fontFamily: V.mono, fontSize: 13, fontWeight: 700, color: scoreColor(item.score) }}>{item.score}/10</span>
            </div>
            {item.evidencias.length > 0 && (
              <>
                <div style={{ fontFamily: V.mono, fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.08em', color: V.text3, marginBottom: 5 }}>Evidências</div>
                {item.evidencias.map((e, i) => (
                  <div key={i} style={{ fontSize: 11, color: V.text2, lineHeight: 1.55, background: V.surface2, borderLeft: `2px solid ${V.border2}`, padding: '5px 9px', marginBottom: 4, borderRadius: '0 3px 3px 0', fontStyle: 'italic' }}>{e}</div>
                ))}
              </>
            )}
            <div style={{ fontFamily: V.mono, fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.08em', color: V.text3, marginBottom: 5, marginTop: 7 }}>Justificativa</div>
            <div style={{ fontSize: 11, color: V.text2, lineHeight: 1.55 }}>{item.justificativa}</div>
            {item.sugestoes.length > 0 && (
              <>
                <div style={{ fontFamily: V.mono, fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.08em', color: V.text3, marginBottom: 5, marginTop: 7 }}>Sugestões</div>
                {item.sugestoes.map((s, i) => (
                  <div key={i} style={{ fontSize: 11, color: V.accent, lineHeight: 1.55 }}>→ {s}</div>
                ))}
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export function MeetingTabs({ data }: { data: MeetingTabData }) {
  const [tab, setTab] = useState('transcricao')

  return (
    <>
      {/* Tab bar */}
      <div style={{
        display: 'flex', borderBottom: `1px solid ${V.border}`,
        marginBottom: 20, padding: '0 32px', gap: 0,
        background: V.surface, marginLeft: -32, marginRight: -32, paddingLeft: 32,
      }}>
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '10px 14px', fontFamily: V.mono, fontSize: 10, fontWeight: 500,
              textTransform: 'uppercase', letterSpacing: '0.08em',
              color: tab === t.key ? V.accent : V.text3,
              background: 'none', border: 'none', cursor: 'pointer',
              borderBottom: tab === t.key ? `2px solid ${V.accent}` : '2px solid transparent',
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'transcricao' && (
        <div>
          {data.transcription ? (
            <div style={{ background: V.surface, border: `1px solid ${V.border}`, borderRadius: 5, overflow: 'hidden' }}>
              <div style={{ padding: '13px 16px', borderBottom: `1px solid ${V.border}` }}>
                <span style={{ fontFamily: V.mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: V.text2 }}>Transcrição Completa</span>
              </div>
              <pre style={{ whiteSpace: 'pre-wrap', padding: 16, fontSize: 12.5, color: V.text1, fontFamily: V.ui, lineHeight: 1.65, maxHeight: '60vh', overflowY: 'auto', margin: 0 }}>
                {data.transcription}
              </pre>
            </div>
          ) : (
            <div style={{ padding: 40, textAlign: 'center', fontFamily: V.mono, fontSize: 10, color: V.text3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Transcrição não disponível
            </div>
          )}
        </div>
      )}

      {tab === 'insights' && (
        data.insights ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { title: '✓ Pontos Positivos', items: data.insights.positivos, titleColor: V.accent, bg: 'rgba(0,229,160,0.04)', border: 'rgba(0,229,160,0.12)' },
              { title: '↑ Oportunidades de Melhoria', items: data.insights.melhorias, titleColor: V.amber, bg: 'rgba(245,158,11,0.04)', border: 'rgba(245,158,11,0.15)' },
            ].map(col => (
              <div key={col.title} style={{ background: V.surface, border: `1px solid ${V.border}`, borderRadius: 5, overflow: 'hidden' }}>
                <div style={{ padding: '11px 16px', borderBottom: `1px solid ${V.border}`, background: col.bg }}>
                  <span style={{ fontFamily: V.mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: col.titleColor }}>{col.title}</span>
                </div>
                <div style={{ padding: '13px 16px' }}>
                  {col.items.length > 0 ? (
                    <ul style={{ paddingLeft: 16, margin: 0 }}>
                      {col.items.map((item, i) => (
                        <li key={i} style={{ fontSize: 12.5, color: V.text1, lineHeight: 1.65, marginBottom: 7 }}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <span style={{ fontSize: 12, color: V.text3 }}>—</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState text="Insights não disponíveis" />
        )
      )}

      {tab === 'objecoes' && (
        data.objecoes.length > 0 ? (
          <div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.18)', borderRadius: 5, padding: '11px 14px', marginBottom: 14 }}>
              <span style={{ color: V.amber, fontSize: 15, flexShrink: 0 }}>⚠</span>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: V.text1, marginBottom: 2 }}>Objeções Identificadas</div>
                <div style={{ fontSize: 11, color: V.text2 }}>Análise das objeções levantadas durante a reunião</div>
              </div>
            </div>
            {data.objecoes.map((o, i) => (
              <div key={i} style={{ background: V.surface, border: `1px solid ${V.border}`, borderRadius: 5, overflow: 'hidden', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', background: V.surface2, borderBottom: `1px solid ${V.border}` }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: V.text1 }}>Objeção #{i + 1}</span>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 3,
                    fontFamily: V.mono, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em',
                    background: o.status === 'quebrada' ? 'rgba(0,229,160,0.1)' : o.status === 'parcial' ? 'rgba(245,158,11,0.1)' : 'rgba(255,68,85,0.1)',
                    color: o.status === 'quebrada' ? V.accent : o.status === 'parcial' ? V.amber : V.red,
                    border: `1px solid ${o.status === 'quebrada' ? 'rgba(0,229,160,0.2)' : o.status === 'parcial' ? 'rgba(245,158,11,0.2)' : 'rgba(255,68,85,0.2)'}`,
                  }}>
                    {o.status === 'quebrada' ? '✓' : o.status === 'parcial' ? '~' : '✗'} {o.status.replace('_', ' ')}
                  </span>
                </div>
                <div style={{ padding: '13px 16px', display: 'flex', flexDirection: 'column', gap: 11 }}>
                  <div>
                    <div style={{ fontFamily: V.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: V.text3, marginBottom: 4 }}>Texto da objeção:</div>
                    <div style={{ fontSize: 12.5, color: V.text1, lineHeight: 1.6 }}>{o.texto}</div>
                  </div>
                  {o.como_tratou && (
                    <div>
                      <div style={{ fontFamily: V.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: V.text3, marginBottom: 4 }}>Como foi tratada:</div>
                      <div style={{ background: V.surface2, border: `1px solid ${V.border}`, borderRadius: 4, padding: '9px 12px', fontSize: 12, color: V.text2, lineHeight: 1.6 }}>{o.como_tratou}</div>
                    </div>
                  )}
                  {o.sugestao_quebra && (
                    <div>
                      <div style={{ fontFamily: V.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: V.text3, marginBottom: 4 }}>Sugestão de quebra:</div>
                      <div style={{ background: 'rgba(0,229,160,0.04)', border: '1px solid rgba(0,229,160,0.12)', borderRadius: 4, padding: '9px 12px', fontSize: 12, color: V.text2, lineHeight: 1.6 }}>
                        {o.sugestao_quebra}
                        <div style={{ marginTop: 8 }}><CopyBtn text={o.sugestao_quebra} /></div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState text="Nenhuma objeção identificada" />
        )
      )}

      {tab === 'followups' && (
        data.followups.length > 0 ? (
          <div>
            {data.followups.map((f, i) => (
              <div key={i} style={{ background: V.surface, border: `1px solid ${V.border}`, borderRadius: 5, padding: '14px 16px', marginBottom: 10, display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <div style={{ fontFamily: V.mono, fontSize: 20, fontWeight: 700, color: V.text3, lineHeight: 1, flexShrink: 0, minWidth: 26 }}>
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: V.text1, marginBottom: 3 }}>
                    {f.canal === 'email' ? '✉ Email' : '💬 WhatsApp'}
                    {f.assunto && ` — ${f.assunto}`}
                  </div>
                  <div style={{ fontSize: 12, color: V.text2, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{f.mensagem}</div>
                  <div style={{ fontFamily: V.mono, fontSize: 10, color: V.accent, marginTop: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{f.timing}</div>
                  <div style={{ marginTop: 8 }}><CopyBtn text={f.mensagem} /></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState text="Nenhum follow-up gerado" />
        )
      )}

      {tab === 'relatorio' && (() => {
        const hasDynamic = data.criteriosResultado && data.criteriosResultado.length > 0
        const hasLegacy = data.relatorioNotas || data.spin
        if (!hasDynamic && !hasLegacy) return <EmptyState text="Relatório não disponível" />

        if (hasDynamic) {
          return (
            <div>
              {data.criteriosResultado!.map((c, i) => {
                const badge = c.obrigatorio ? 'Obrigatório' : undefined
                if (c.key === 'spin_selling' && c.spinBreakdown) {
                  return (
                    <div key={c.key} style={{ background: V.surface, border: `1px solid ${V.border}`, borderRadius: 5, overflow: 'hidden', marginBottom: 12 }}>
                      <SpinBreakdownCard title={`${i + 1} — ${c.label}`} score={c.nota} />
                      <SpinGrid {...c.spinBreakdown} />
                    </div>
                  )
                }
                return (
                  <NotaCard
                    key={c.key}
                    title={`${i + 1} — ${c.label}`}
                    badge={badge}
                    nota={{ valor: c.nota, justificativa: c.justificativa, evidencias: c.evidencias, sugestoes: c.sugestoes }}
                  />
                )
              })}
            </div>
          )
        }

        return (
          <div>
            <NotaCard title="1 — Escuta Ativa" nota={data.relatorioNotas?.escuta ?? null} />
            <NotaCard title="2 — Quebra de Objeções" nota={data.relatorioNotas?.objecoes_nota ?? null} />
            <NotaCard title="3 — Apresentação do Produto/Serviço" nota={data.relatorioNotas?.apresentacao ?? null} />

            {data.spin && (
              <div style={{ background: V.surface, border: `1px solid ${V.border}`, borderRadius: 5, overflow: 'hidden' }}>
                <SpinBreakdownCard title="4 — SPIN Selling" score={data.spin.score} />
                <SpinGrid S={data.spin.S} P={data.spin.P} I={data.spin.I} N={data.spin.N} />
              </div>
            )}
          </div>
        )
      })()}

      {tab === 'email' && (
        data.followups.filter(f => f.canal === 'email').length > 0 ? (
          <div>
            {data.followups.filter(f => f.canal === 'email').map((f, i) => (
              <div key={i} style={{ background: V.surface, border: `1px solid ${V.border}`, borderRadius: 5, overflow: 'hidden', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', borderBottom: `1px solid ${V.border}` }}>
                  <span style={{ fontFamily: V.mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: V.text2 }}>Email de Retorno</span>
                  <CopyBtn text={`${f.assunto ? `Assunto: ${f.assunto}\n\n` : ''}${f.mensagem}`} />
                </div>
                <div style={{ padding: '16px 18px', fontSize: 12.5, color: V.text1, lineHeight: 1.75, fontFamily: V.mono }}>
                  {f.assunto && <div style={{ fontFamily: V.ui, fontSize: 13, fontWeight: 600, color: V.text1, marginBottom: 12, paddingBottom: 10, borderBottom: `1px solid ${V.border}` }}>{f.assunto}</div>}
                  <div style={{ whiteSpace: 'pre-wrap' }}>{f.mensagem}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState text="Nenhum email gerado" />
        )
      )}

      {tab === 'proposta' && (
        data.proposta ? (
          <div style={{ background: V.surface, border: `1px solid ${V.border}`, borderRadius: 5, overflow: 'hidden' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', borderBottom: `1px solid ${V.border}` }}>
              <span style={{ fontFamily: V.mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', color: V.text2 }}>Proposta</span>
              <CopyBtn text={data.proposta} />
            </div>
            <div style={{ padding: '16px 18px', fontSize: 12.5, color: V.text1, lineHeight: 1.75, fontFamily: V.mono, whiteSpace: 'pre-wrap' }}>
              {data.proposta}
            </div>
          </div>
        ) : (
          <EmptyState text="Proposta não disponível" />
        )
      )}
    </>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div style={{ padding: 40, textAlign: 'center', fontFamily: V.mono, fontSize: 10, color: V.text3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
      {text}
    </div>
  )
}

// fmtScore re-exported for pages that compute scorecards dynamically using the same formatting
export { fmtScore }
