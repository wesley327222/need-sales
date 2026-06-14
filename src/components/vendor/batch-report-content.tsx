'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { V, scoreColor, fmtScore } from './colors'
import { ScoreRing } from './score-ring'

// --- Types ---
interface IndividualCall {
  id: string
  titulo: string
  status: string
  nota_geral: number | null
  nota_acesso_decisor: number | null
  nota_pedido_reuniao: number | null
  nota_conducao_conversa: number | null
}

interface ObjecaoPadrao {
  objecao: string
  frequencia: number
  calls_origem: string[]
  trecho_lead: string
  trecho_resposta_vendedor: string
  status: 'QUEBRADA' | 'TRATADA_PARCIALMENTE' | 'IGNORADA' | 'PIORADA'
  como_tratar: string
}

interface InsightPadrao {
  titulo: string
  descricao: string
  call_origem: string
  impacto: 'alto' | 'medio' | 'baixo'
}

interface FollowupRecom {
  oportunidade: string
  acao: string
  prioridade: 'ALTA' | 'MEDIA' | 'BAIXA'
  gatilho_da_call: string
  o_que_nao_dizer: string
}

interface Competidor {
  nome: string
  calls_mencionado: string[]
  contexto: string
}

interface Avaliacao {
  nota_geral: number
  probabilidade_fechamento: number
  maior_erro: string
  perfil_vendedor: string
  pontos_fortes: string[]
  pontos_criticos: string[]
  recomendacoes_coaching: string[]
  proximos_passos: string[]
}

interface BatchRelatorio {
  objecoes: ObjecaoPadrao[]
  insights: InsightPadrao[]
  sobre_competicao: Competidor[]
  followups: FollowupRecom[]
  avaliacao: Avaliacao
}

interface BatchStatus {
  id: string
  nome: string
  status: string
  total: number
  processadas: number
  pct: number
  relatorio: BatchRelatorio | null
  ligacoes: IndividualCall[]
  created_at: string
}

// --- Sub-components ---
function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 3,
      fontSize: 10, fontFamily: V.mono, textTransform: 'uppercase',
      letterSpacing: '0.08em', fontWeight: 700, color, background: bg,
    }}>{label}</span>
  )
}

function objecaoStatusBadge(status: ObjecaoPadrao['status']) {
  const map = {
    QUEBRADA:              { label: 'Quebrada',       color: V.accent, bg: 'rgba(0,229,160,0.1)' },
    TRATADA_PARCIALMENTE:  { label: 'Parcial',         color: V.amber,  bg: 'rgba(245,158,11,0.1)' },
    IGNORADA:              { label: 'Ignorada',        color: V.text3,  bg: V.surface2 },
    PIORADA:               { label: 'Piorada',         color: V.red,    bg: 'rgba(255,68,85,0.1)' },
  }
  const s = map[status] ?? map.IGNORADA
  return <Badge label={s.label} color={s.color} bg={s.bg} />
}

function impactoBadge(impacto: InsightPadrao['impacto']) {
  const map = {
    alto:  { label: 'Alto',  color: V.red,    bg: 'rgba(255,68,85,0.1)' },
    medio: { label: 'Médio', color: V.amber,  bg: 'rgba(245,158,11,0.1)' },
    baixo: { label: 'Baixo', color: V.text3,  bg: V.surface2 },
  }
  const s = map[impacto] ?? map.baixo
  return <Badge label={s.label} color={s.color} bg={s.bg} />
}

function prioridadeBadge(p: FollowupRecom['prioridade']) {
  const map = {
    ALTA:  { label: 'Alta',  color: V.red,   bg: 'rgba(255,68,85,0.1)' },
    MEDIA: { label: 'Média', color: V.amber, bg: 'rgba(245,158,11,0.1)' },
    BAIXA: { label: 'Baixa', color: V.text3, bg: V.surface2 },
  }
  const s = map[p] ?? map.BAIXA
  return <Badge label={s.label} color={s.color} bg={s.bg} />
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: V.mono, fontSize: 10, textTransform: 'uppercase',
      letterSpacing: '0.12em', color: V.text3, marginBottom: 14,
    }}>
      {children}
    </div>
  )
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: V.surface, border: `1px solid ${V.border}`,
      borderRadius: 6, padding: 20, ...style,
    }}>
      {children}
    </div>
  )
}

function BulletList({ items, color }: { items: string[]; color?: string }) {
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
      {items.map((item, i) => (
        <li key={i} style={{ display: 'flex', gap: 8, marginBottom: 8, alignItems: 'flex-start' }}>
          <span style={{ color: color ?? V.accent, flexShrink: 0, marginTop: 1 }}>•</span>
          <span style={{ fontSize: 13, color: V.text2, lineHeight: 1.5 }}>{item}</span>
        </li>
      ))}
    </ul>
  )
}

function Quote({ text }: { text: string }) {
  return (
    <div style={{
      padding: '8px 12px', borderLeft: `2px solid ${V.border2}`,
      background: V.surface2, borderRadius: '0 4px 4px 0',
      fontSize: 11, color: V.text2, fontStyle: 'italic', lineHeight: 1.5,
      marginTop: 6,
    }}>
      "{text}"
    </div>
  )
}

// --- Main component ---
export function BatchReportContent({ loteId }: { loteId: string }) {
  const [data, setData] = useState<BatchStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'objecoes' | 'insights' | 'followups' | 'avaliacao' | 'competicao'>('avaliacao')

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/lotes/${loteId}/status`)
      if (!res.ok) { setError('Pack não encontrado'); return }
      const json: BatchStatus = await res.json()
      setData(json)
      setLoading(false)
    } catch {
      setError('Erro ao carregar status')
      setLoading(false)
    }
  }, [loteId])

  useEffect(() => {
    fetchStatus()
  }, [fetchStatus])

  // Poll every 4s while processing
  useEffect(() => {
    if (!data || data.status === 'done' || data.status === 'error') return
    const interval = setInterval(fetchStatus, 4000)
    return () => clearInterval(interval)
  }, [data, fetchStatus])

  if (loading) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: V.text3, fontFamily: V.ui }}>
        Carregando...
      </div>
    )
  }

  if (error || !data) {
    return (
      <div style={{ padding: 40, fontFamily: V.ui }}>
        <div style={{ color: V.red, fontSize: 14, marginBottom: 12 }}>{error ?? 'Pack não encontrado'}</div>
        <Link href="/vendor/calls" style={{ fontSize: 13, color: V.accent }}>← Voltar para Ligações</Link>
      </div>
    )
  }

  const isDone = data.status === 'done'
  const isError = data.status === 'error'
  const rel = data.relatorio

  const TABS = [
    { key: 'avaliacao'  as const, label: 'Avaliação' },
    { key: 'objecoes'   as const, label: `Objeções (${rel?.objecoes.length ?? 0})` },
    { key: 'insights'   as const, label: `Insights (${rel?.insights.length ?? 0})` },
    { key: 'followups'  as const, label: `Follow-ups (${rel?.followups.length ?? 0})` },
    ...(rel?.sobre_competicao?.length ? [{ key: 'competicao' as const, label: `Competição (${rel.sobre_competicao.length})` }] : []),
  ]

  return (
    <div style={{ padding: 28, maxWidth: 1000, margin: '0 auto', fontFamily: V.ui }}>
      {/* Back link */}
      <Link href="/vendor/calls" style={{ fontSize: 12, color: V.text3, textDecoration: 'none', display: 'block', marginBottom: 20 }}>
        ← Ligações
      </Link>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: V.text1, margin: 0 }}>
            {data.nome}
          </h1>
          {isDone && <Badge label="Concluído" color={V.accent} bg="rgba(0,229,160,0.1)" />}
          {isError && <Badge label="Erro" color={V.red} bg="rgba(255,68,85,0.1)" />}
          {!isDone && !isError && <Badge label="Processando" color={V.amber} bg="rgba(245,158,11,0.1)" />}
        </div>
        <div style={{ fontFamily: V.mono, fontSize: 10, color: V.text3, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {data.processadas} / {data.total} ligaç{data.total === 1 ? 'ão' : 'ões'} analisadas
          {' '}·{' '}{new Date(data.created_at).toLocaleDateString('pt-BR')}
        </div>
      </div>

      {/* Progress bar (while processing) */}
      {!isDone && !isError && (
        <Card style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 13, color: V.text2, marginBottom: 14 }}>
            Análise de IA em andamento...
          </div>
          <div style={{ height: 4, background: V.border2, borderRadius: 2, marginBottom: 8 }}>
            <div style={{
              width: `${data.pct}%`, height: 4, background: V.accent,
              borderRadius: 2, transition: 'width 0.5s',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: V.mono, fontSize: 10, color: V.text3 }}>
            <span>{data.processadas} processadas</span>
            <span>{data.pct}%</span>
          </div>
          {data.total > data.processadas && (
            <div style={{ marginTop: 14, fontSize: 11, color: V.text3 }}>
              O relatório consolidado será gerado automaticamente quando todas as ligações forem analisadas.
            </div>
          )}
        </Card>
      )}

      {/* Individual calls table */}
      {data.ligacoes.length > 0 && (
        <Card style={{ marginBottom: 24 }}>
          <SectionTitle>Ligações individuais</SectionTitle>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['#', 'Título', 'Nota', 'Acesso Decisor', 'Pedido Reunião', 'Condução', 'Status'].map(h => (
                    <th key={h} style={{
                      textAlign: 'left', fontFamily: V.mono, fontSize: 9,
                      textTransform: 'uppercase', letterSpacing: '0.08em',
                      color: V.text3, paddingBottom: 10, fontWeight: 400,
                      paddingRight: 16, whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.ligacoes.map((call, i) => (
                  <tr key={call.id} style={{ borderTop: `1px solid ${V.border}` }}>
                    <td style={{ padding: '10px 16px 10px 0', fontFamily: V.mono, fontSize: 11, color: V.text3 }}>{i + 1}</td>
                    <td style={{ padding: '10px 16px 10px 0', maxWidth: 200 }}>
                      <Link href={`/vendor/calls/${call.id}`} style={{
                        fontSize: 12, color: V.text1, textDecoration: 'none', fontWeight: 500,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        display: 'block',
                      }}>
                        {call.titulo}
                      </Link>
                    </td>
                    <td style={{ padding: '10px 16px 10px 0' }}>
                      <span style={{ fontFamily: V.mono, fontSize: 13, fontWeight: 700, color: scoreColor(call.nota_geral) }}>
                        {fmtScore(call.nota_geral)}
                      </span>
                    </td>
                    <td style={{ padding: '10px 16px 10px 0', fontFamily: V.mono, fontSize: 12, color: scoreColor(call.nota_acesso_decisor) }}>
                      {fmtScore(call.nota_acesso_decisor)}
                    </td>
                    <td style={{ padding: '10px 16px 10px 0', fontFamily: V.mono, fontSize: 12, color: scoreColor(call.nota_pedido_reuniao) }}>
                      {fmtScore(call.nota_pedido_reuniao)}
                    </td>
                    <td style={{ padding: '10px 16px 10px 0', fontFamily: V.mono, fontSize: 12, color: scoreColor(call.nota_conducao_conversa) }}>
                      {fmtScore(call.nota_conducao_conversa)}
                    </td>
                    <td style={{ padding: '10px 0 10px 0' }}>
                      {call.status === 'processado' && <Badge label="Pronto" color={V.accent} bg="rgba(0,229,160,0.1)" />}
                      {call.status === 'processing' && <Badge label="Analisando" color={V.amber} bg="rgba(245,158,11,0.1)" />}
                      {call.status === 'pending' && <Badge label="Aguardando" color={V.text3} bg={V.surface2} />}
                      {call.status === 'error' && <Badge label="Erro" color={V.red} bg="rgba(255,68,85,0.1)" />}
                      {call.status === 'partial' && <Badge label="Parcial" color={V.amber} bg="rgba(245,158,11,0.1)" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Agent 2 Report */}
      {isDone && rel && (
        <div>
          {/* Score overview */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
            <Card style={{ textAlign: 'center' }}>
              <div style={{ marginBottom: 8 }}>
                <ScoreRing score={rel.avaliacao.nota_geral} size={64} />
              </div>
              <div style={{ fontFamily: V.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: V.text3 }}>
                Nota Geral
              </div>
            </Card>
            <Card style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: scoreColor(rel.avaliacao.probabilidade_fechamento / 10), marginBottom: 6 }}>
                {rel.avaliacao.probabilidade_fechamento}%
              </div>
              <div style={{ fontFamily: V.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: V.text3 }}>
                Probabilidade de Fechamento
              </div>
            </Card>
            <Card style={{ gridColumn: 'span 2' }}>
              <div style={{ fontFamily: V.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: V.red, marginBottom: 8 }}>
                Maior Erro
              </div>
              <div style={{ fontSize: 13, color: V.text1, lineHeight: 1.5 }}>{rel.avaliacao.maior_erro}</div>
            </Card>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: `1px solid ${V.border}`, paddingBottom: 0 }}>
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: '8px 14px', border: 'none', cursor: 'pointer',
                  background: 'none', fontFamily: V.ui, fontSize: 13,
                  color: activeTab === tab.key ? V.text1 : V.text3,
                  fontWeight: activeTab === tab.key ? 700 : 400,
                  borderBottom: activeTab === tab.key ? `2px solid ${V.accent}` : '2px solid transparent',
                  marginBottom: -1,
                  whiteSpace: 'nowrap',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab: Avaliação */}
          {activeTab === 'avaliacao' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <Card>
                <SectionTitle>Perfil do Vendedor</SectionTitle>
                <div style={{ fontSize: 13, color: V.text2, lineHeight: 1.6 }}>{rel.avaliacao.perfil_vendedor}</div>
              </Card>

              <Card>
                <SectionTitle>Pontos Fortes</SectionTitle>
                <BulletList items={rel.avaliacao.pontos_fortes} color={V.accent} />
              </Card>

              <Card>
                <SectionTitle>Pontos Críticos</SectionTitle>
                <BulletList items={rel.avaliacao.pontos_criticos} color={V.red} />
              </Card>

              <Card>
                <SectionTitle>Recomendações de Coaching</SectionTitle>
                <BulletList items={rel.avaliacao.recomendacoes_coaching} color={V.amber} />
              </Card>

              <Card style={{ gridColumn: 'span 2' }}>
                <SectionTitle>Próximos Passos</SectionTitle>
                <BulletList items={rel.avaliacao.proximos_passos} color={V.blue} />
              </Card>
            </div>
          )}

          {/* Tab: Objeções */}
          {activeTab === 'objecoes' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {rel.objecoes.map((obj, i) => (
                <Card key={i}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 12 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: V.text1, marginBottom: 6, lineHeight: 1.4 }}>
                        {obj.objecao}
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        {objecaoStatusBadge(obj.status)}
                        <span style={{ fontFamily: V.mono, fontSize: 10, color: V.text3 }}>
                          {obj.frequencia}× · {obj.calls_origem.join(', ')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                    <div>
                      <div style={{ fontFamily: V.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: V.text3, marginBottom: 4 }}>
                        Lead disse
                      </div>
                      <Quote text={obj.trecho_lead} />
                    </div>
                    <div>
                      <div style={{ fontFamily: V.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: V.text3, marginBottom: 4 }}>
                        Vendedor respondeu
                      </div>
                      <Quote text={obj.trecho_resposta_vendedor} />
                    </div>
                  </div>

                  <div style={{ padding: '10px 12px', background: 'rgba(0,229,160,0.05)', border: `1px solid ${V.border}`, borderRadius: 4 }}>
                    <div style={{ fontFamily: V.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: V.accent, marginBottom: 6 }}>
                      Como Tratar
                    </div>
                    <div style={{ fontSize: 12, color: V.text2, lineHeight: 1.6 }}>{obj.como_tratar}</div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Tab: Insights */}
          {activeTab === 'insights' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
              {rel.insights.map((ins, i) => (
                <Card key={i}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    {impactoBadge(ins.impacto)}
                    <span style={{ fontFamily: V.mono, fontSize: 9, color: V.text3 }}>{ins.call_origem}</span>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: V.text1, marginBottom: 8 }}>{ins.titulo}</div>
                  <div style={{ fontSize: 12, color: V.text2, lineHeight: 1.6 }}>{ins.descricao}</div>
                </Card>
              ))}
            </div>
          )}

          {/* Tab: Follow-ups */}
          {activeTab === 'followups' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {rel.followups.map((fu, i) => (
                <Card key={i}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
                    <div style={{ flexShrink: 0, marginTop: 2 }}>{prioridadeBadge(fu.prioridade)}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: V.text1, marginBottom: 4 }}>{fu.oportunidade}</div>
                      <div style={{ fontFamily: V.mono, fontSize: 10, color: V.text3 }}>Gatilho: {fu.gatilho_da_call}</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div style={{ padding: '10px 12px', background: V.surface2, borderRadius: 4 }}>
                      <div style={{ fontFamily: V.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: V.accent, marginBottom: 6 }}>
                        Ação
                      </div>
                      <div style={{ fontSize: 12, color: V.text2, lineHeight: 1.5 }}>{fu.acao}</div>
                    </div>
                    <div style={{ padding: '10px 12px', background: 'rgba(255,68,85,0.05)', border: `1px solid rgba(255,68,85,0.1)`, borderRadius: 4 }}>
                      <div style={{ fontFamily: V.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.08em', color: V.red, marginBottom: 6 }}>
                        Não Dizer
                      </div>
                      <div style={{ fontSize: 12, color: V.text2, lineHeight: 1.5 }}>{fu.o_que_nao_dizer}</div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Tab: Competição */}
          {activeTab === 'competicao' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {rel.sobre_competicao.map((comp, i) => (
                <Card key={i}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: V.text1 }}>{comp.nome}</div>
                    <span style={{ fontFamily: V.mono, fontSize: 10, color: V.text3 }}>
                      {comp.calls_mencionado.join(', ')}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: V.text2, lineHeight: 1.6 }}>{comp.contexto}</div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Error state */}
      {isError && (
        <Card>
          <div style={{ fontSize: 13, color: V.red, marginBottom: 8 }}>Erro durante o processamento do pack.</div>
          <div style={{ fontSize: 12, color: V.text3 }}>
            Algumas ligações podem ter sido analisadas individualmente. Verifique a lista acima.
          </div>
        </Card>
      )}
    </div>
  )
}
