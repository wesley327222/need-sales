import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/server'
import { MeetingTabs, type MeetingTabData } from '@/components/vendor/meeting-tabs'
import { AudioPlayer } from '@/components/vendor/audio-player'
import { ReprocessButton } from '@/components/vendor/reprocess-button'
import type { SpinResult, ObjecaoAvaliada } from '@/lib/types/agents'

const D = {
  bg: '#0A0A0B', surface: '#111113', surface2: '#18181B',
  border: '#1E1E22', border2: '#2A2A30',
  text1: '#F0F0F4', text2: '#8A8A96', text3: '#4A4A56',
  accent: '#00E5A0', amber: '#F59E0B', red: '#FF4455', blue: '#4F8EF7',
  mono: "'JetBrains Mono', monospace", ui: "'Space Grotesk', system-ui, sans-serif",
}

function scoreColor(s: number | null | undefined) {
  if (s == null) return D.text3
  if (s >= 7.5) return D.accent
  if (s >= 6)   return D.amber
  return D.red
}

function fmtScore(s: number | null | undefined) {
  return s == null ? '—' : s.toFixed(1)
}

interface Props { params: Promise<{ id: string }> }

export default async function MeetingDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = createServiceClient()

  const { data: reuniao, error } = await supabase
    .from('reunioes').select('*').eq('id', id).single()
  if (error || !reuniao) notFound()

  const { data: audioData } = reuniao.audio_url
    ? await supabase.storage.from('audio-files').createSignedUrl(reuniao.audio_url, 3600)
    : { data: null }
  const audioUrl = audioData?.signedUrl ?? null

  const seller = reuniao.vendedor_id
    ? (await supabase.from('profiles').select('nome').eq('id', reuniao.vendedor_id).single()).data
    : null

  const clienteNome = reuniao.cliente_id
    ? (await supabase.from('clientes').select('nome').eq('id', reuniao.cliente_id).single()).data?.nome ?? null
    : null

  const objecoesArr = Array.isArray(reuniao.objecoes) ? (reuniao.objecoes as unknown as ObjecaoAvaliada[]) : []
  type InsightsDb = { positivos?: string[]; melhorias?: string[] } | string[]
  const insightsRaw = reuniao.insights as InsightsDb | null
  const insightsObj = insightsRaw
    ? Array.isArray(insightsRaw)
      ? { positivos: (insightsRaw as string[]).slice(0, 3), melhorias: (insightsRaw as string[]).slice(3) }
      : { positivos: insightsRaw.positivos ?? [], melhorias: insightsRaw.melhorias ?? [] }
    : null
  const insights: MeetingTabData['insights'] =
    insightsObj && (insightsObj.positivos.length > 0 || insightsObj.melhorias.length > 0) ? insightsObj : null

  type NotaDb = { valor: number; justificativa?: string; evidencias?: string[]; sugestoes?: string[] }
  function mapNota(raw: unknown) {
    if (!raw || typeof raw !== 'object') return null
    const n = raw as NotaDb
    if (typeof n.valor !== 'number') return null
    return { valor: n.valor, justificativa: n.justificativa ?? '', evidencias: n.evidencias ?? [], sugestoes: n.sugestoes ?? [] }
  }
  const relatorioNotas: MeetingTabData['relatorioNotas'] = {
    escuta:       mapNota(reuniao.relatorio_nota_1),
    objecoes_nota: mapNota(reuniao.relatorio_nota_2),
    apresentacao: mapNota(reuniao.relatorio_nota_3),
  }

  const followups: MeetingTabData['followups'] = []
  if (reuniao.follow_whatsapp_d1) followups.push({ canal: 'whatsapp', timing: 'D+1', assunto: null, mensagem: reuniao.follow_whatsapp_d1 })
  if (reuniao.follow_whatsapp_d3) followups.push({ canal: 'whatsapp', timing: 'D+3', assunto: null, mensagem: reuniao.follow_whatsapp_d3 })
  if (reuniao.follow_email_5) {
    const lines = reuniao.follow_email_5.split('\n\n')
    followups.push({ canal: 'email', timing: 'D+5', assunto: lines[0] ?? null, mensagem: lines.slice(1).join('\n\n') || reuniao.follow_email_5 })
  }

  const spinRaw = (reuniao as Record<string, unknown>)["Spin"] as SpinResult | null
  const spinData: MeetingTabData['spin'] = spinRaw?.nota4 ? {
    score: spinRaw.nota4.media,
    S: { score: spinRaw.nota4.S.valor, evidencias: spinRaw.nota4.S.evidencias ?? [], justificativa: spinRaw.nota4.S.justificativa ?? '', sugestoes: spinRaw.nota4.S.sugestoes ?? [] },
    P: { score: spinRaw.nota4.P.valor, evidencias: spinRaw.nota4.P.evidencias ?? [], justificativa: spinRaw.nota4.P.justificativa ?? '', sugestoes: spinRaw.nota4.P.sugestoes ?? [] },
    I: { score: spinRaw.nota4.I.valor, evidencias: spinRaw.nota4.I.evidencias ?? [], justificativa: spinRaw.nota4.I.justificativa ?? '', sugestoes: spinRaw.nota4.I.sugestoes ?? [] },
    N: { score: spinRaw.nota4.N.valor, evidencias: spinRaw.nota4.N.evidencias ?? [], justificativa: spinRaw.nota4.N.justificativa ?? '', sugestoes: spinRaw.nota4.N.sugestoes ?? [] },
  } : null

  type PropostaDb = { sugerida?: string }
  const propostaRaw = reuniao.proposta as PropostaDb | null

  const tabData: MeetingTabData = {
    transcription: reuniao.transcricao,
    duration_seconds: reuniao.duracao,
    insights,
    objecoes: objecoesArr.map(o => ({ numero: o.numero, texto: o.texto, status: o.status, como_tratou: o.como_tratou, sugestao_quebra: o.sugestao_quebra })),
    followups,
    relatorioNotas: (relatorioNotas.escuta || relatorioNotas.objecoes_nota || relatorioNotas.apresentacao) ? relatorioNotas : null,
    spin: spinData,
    proposta: propostaRaw?.sugerida ?? reuniao.follow_email_5 ?? null,
  }

  const CRITERIA = [
    { key: 'geral',        label: 'Nota Geral',    val: reuniao.nota_geral,        main: true },
    { key: 'escuta',       label: 'Escuta Ativa',  val: reuniao.nota_escuta,       main: false },
    { key: 'objecoes',     label: 'Objeções',      val: reuniao.nota_objecoes,     main: false },
    { key: 'apresentacao', label: 'Apresentação',  val: reuniao.nota_apresentacao, main: false },
    { key: 'spin',         label: 'SPIN Selling',  val: spinRaw?.nota4?.media ?? null, main: false },
  ]

  return (
    <div style={{ fontFamily: D.ui, color: D.text1 }}>
      {/* Top header */}
      <div style={{ background: D.surface, borderBottom: `1px solid ${D.border}`, padding: '20px 32px 0' }}>
        <a href="/meetings" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: D.mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: D.text3, textDecoration: 'none', marginBottom: 14 }}>
          ‹ Reuniões
        </a>

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 4, color: D.text1 }}>{reuniao.titulo}</h1>
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
              {clienteNome && <span style={{ fontFamily: D.mono, fontSize: 10, color: D.text3 }}>Cliente: {clienteNome}</span>}
              {seller?.nome && <span style={{ fontFamily: D.mono, fontSize: 10, color: D.text3 }}>Vendedor: {seller.nome}</span>}
              {reuniao.data_hora && <span style={{ fontFamily: D.mono, fontSize: 10, color: D.text3 }}>{new Date(reuniao.data_hora).toLocaleString('pt-BR')}</span>}
              {reuniao.duracao && <span style={{ fontFamily: D.mono, fontSize: 10, color: D.text3 }}>{Math.floor(reuniao.duracao / 60)}min</span>}
              {(() => {
                const isDone = ['processado','done','partial'].includes(reuniao.status ?? '')
                const isErr  = ['error','erro'].includes(reuniao.status ?? '')
                return (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 3, fontFamily: D.mono, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', background: isDone ? 'rgba(0,229,160,0.08)' : isErr ? 'rgba(255,68,85,0.08)' : 'rgba(245,158,11,0.1)', color: isDone ? D.accent : isErr ? D.red : D.amber, border: `1px solid ${isDone ? 'rgba(0,229,160,0.15)' : isErr ? 'rgba(255,68,85,0.2)' : 'rgba(245,158,11,0.2)'}` }}>
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
                    {isDone ? 'Analisada' : isErr ? 'Erro na análise' : (reuniao.status ?? 'Processando')}
                  </span>
                )
              })()}
            </div>
          </div>
          <ReprocessButton meetingId={id} tipo="reuniao" />
        </div>

        {/* Scorecard */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontFamily: D.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: D.text3, marginBottom: 8 }}>Avaliação da Reunião</div>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${CRITERIA.length},1fr)`, gap: 1, background: D.border, border: `1px solid ${D.border}`, borderRadius: 5, overflow: 'hidden' }}>
            {CRITERIA.map(c => (
              <div key={c.key} style={{ background: c.main ? D.surface2 : D.surface, padding: '14px 16px', textAlign: 'center' }}>
                <div style={{ fontFamily: D.mono, fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.1em', color: D.text3, marginBottom: 6 }}>{c.label}</div>
                <div style={{ fontFamily: D.mono, fontSize: 26, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1, color: scoreColor(c.val) }}>{fmtScore(c.val)}</div>
                <div style={{ height: 2, background: D.border2, borderRadius: 1, marginTop: 6 }}>
                  {c.val != null && <div style={{ width: `${(c.val / 10) * 100}%`, height: 2, background: scoreColor(c.val), borderRadius: 1 }} />}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: '0 32px 40px', paddingTop: 22 }}>
        {audioUrl && (
          <div style={{ marginBottom: 20 }}>
            <AudioPlayer url={audioUrl} filename={reuniao.audio_filename} />
          </div>
        )}
        <MeetingTabs data={tabData} />
      </div>
    </div>
  )
}
