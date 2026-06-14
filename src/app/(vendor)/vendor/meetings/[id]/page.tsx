import { notFound, redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { VendorSidebar } from '@/components/vendor/sidebar'
import { MeetingTabs, type MeetingTabData } from '@/components/vendor/meeting-tabs'
import { AudioPlayer } from '@/components/vendor/audio-player'
import { V, scoreColor, fmtScore } from '@/components/vendor/colors'
import { ReprocessButton } from '@/components/vendor/reprocess-button'
import type { SpinResult, ObjecaoAvaliada } from '@/lib/types/agents'

interface Props {
  params: Promise<{ id: string }>
}

export default async function VendorMeetingDetail({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const service = createServiceClient()
  const { data: profile } = await service.from('profiles').select('nome, role').eq('id', user.id).single()
  const initials = (profile?.nome ?? 'V').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  const { data: reuniao, error } = await service
    .from('reunioes')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !reuniao) notFound()

  // Signed URL for audio playback (valid 1h)
  const { data: audioData } = reuniao.audio_url
    ? await service.storage.from('audio-files').createSignedUrl(reuniao.audio_url, 3600)
    : { data: null }
  const audioUrl = audioData?.signedUrl ?? null

  // "Spin" is the actual DB column (capital S) — analise is the TS type alias
  const spinRaw = (reuniao as Record<string, unknown>)["Spin"] as SpinResult | null

  // Scores from inline columns
  const scores = {
    geral:        reuniao.nota_geral,
    escuta:       reuniao.nota_escuta,
    objecoes:     reuniao.nota_objecoes,
    apresentacao: reuniao.nota_apresentacao,
    spin:         spinRaw?.nota4?.media ?? null,
  }

  // Insights — structured { positivos, melhorias } or legacy flat array
  type InsightsDb = { positivos?: string[]; melhorias?: string[] } | string[]
  const insightsRaw = reuniao.insights as InsightsDb | null
  const insightsObj = insightsRaw
    ? Array.isArray(insightsRaw)
      ? { positivos: (insightsRaw as string[]).slice(0, 3), melhorias: (insightsRaw as string[]).slice(3) }
      : { positivos: insightsRaw.positivos ?? [], melhorias: insightsRaw.melhorias ?? [] }
    : null
  const insights: MeetingTabData['insights'] =
    insightsObj && (insightsObj.positivos.length > 0 || insightsObj.melhorias.length > 0)
      ? insightsObj
      : null

  // Objeções
  const objecoesArr = Array.isArray(reuniao.objecoes) ? (reuniao.objecoes as unknown as ObjecaoAvaliada[]) : []

  // Relatório das notas from relatorio_nota_1/2/3 columns
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
  const hasRelatorio = relatorioNotas.escuta || relatorioNotas.objecoes_nota || relatorioNotas.apresentacao

  // Follow-ups from inline columns
  const followups: MeetingTabData['followups'] = []
  if (reuniao.follow_whatsapp_d1) {
    followups.push({ canal: 'whatsapp', timing: 'D+1', assunto: null, mensagem: reuniao.follow_whatsapp_d1 })
  }
  if (reuniao.follow_whatsapp_d3) {
    followups.push({ canal: 'whatsapp', timing: 'D+3', assunto: null, mensagem: reuniao.follow_whatsapp_d3 })
  }
  if (reuniao.follow_email_5) {
    const lines = reuniao.follow_email_5.split('\n\n')
    const assunto = lines[0] ?? null
    const mensagem = lines.slice(1).join('\n\n') || reuniao.follow_email_5
    followups.push({ canal: 'email', timing: 'D+5', assunto, mensagem })
  }

  // SPIN from Spin column
  const spinData: MeetingTabData['spin'] = spinRaw?.nota4 ? {
    score: spinRaw.nota4.media,
    S: { score: spinRaw.nota4.S.valor, evidencias: spinRaw.nota4.S.evidencias ?? [], justificativa: spinRaw.nota4.S.justificativa ?? '', sugestoes: spinRaw.nota4.S.sugestoes ?? [] },
    P: { score: spinRaw.nota4.P.valor, evidencias: spinRaw.nota4.P.evidencias ?? [], justificativa: spinRaw.nota4.P.justificativa ?? '', sugestoes: spinRaw.nota4.P.sugestoes ?? [] },
    I: { score: spinRaw.nota4.I.valor, evidencias: spinRaw.nota4.I.evidencias ?? [], justificativa: spinRaw.nota4.I.justificativa ?? '', sugestoes: spinRaw.nota4.I.sugestoes ?? [] },
    N: { score: spinRaw.nota4.N.valor, evidencias: spinRaw.nota4.N.evidencias ?? [], justificativa: spinRaw.nota4.N.justificativa ?? '', sugestoes: spinRaw.nota4.N.sugestoes ?? [] },
  } : null

  // Proposta from proposta jsonb column
  type PropostaDb = { sugerida?: string; interesses?: string[]; dores?: string[] }
  const propostaRaw = reuniao.proposta as PropostaDb | null
  const propostaText = propostaRaw?.sugerida ?? null

  const tabData: MeetingTabData = {
    transcription: reuniao.transcricao,
    duration_seconds: reuniao.duracao,
    insights,
    objecoes: objecoesArr.map(o => ({
      numero: o.numero,
      texto: o.texto,
      status: o.status,
      como_tratou: o.como_tratou,
      sugestao_quebra: o.sugestao_quebra,
    })),
    followups,
    relatorioNotas: hasRelatorio ? relatorioNotas : null,
    spin: spinData,
    proposta: propostaText ?? reuniao.follow_email_5 ?? null,
  }

  const CRITERIA = [
    { key: 'geral',        label: 'Nota Geral',    val: scores.geral,        main: true },
    { key: 'escuta',       label: 'Escuta Ativa',  val: scores.escuta,       main: false },
    { key: 'objecoes',     label: 'Objeções',       val: scores.objecoes,     main: false },
    { key: 'apresentacao', label: 'Apresentação',   val: scores.apresentacao, main: false },
    { key: 'spin',         label: 'SPIN Selling',   val: scores.spin,         main: false },
  ]

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <VendorSidebar userName={profile?.nome ?? ''} userInitials={initials} userRole={profile?.role ?? 'seller'} />

      <main style={{ flex: 1, overflowY: 'auto', background: V.bg }}>
        <div style={{ background: V.surface, borderBottom: `1px solid ${V.border}`, padding: '20px 32px 0' }}>
          <a href="/vendor/meetings" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: V.mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: V.text3, textDecoration: 'none', marginBottom: 14 }}>
            ‹ Minhas Reuniões
          </a>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 4 }}>{reuniao.titulo}</h1>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                {reuniao.data_hora && <span style={{ fontFamily: V.mono, fontSize: 10, color: V.text3 }}>{new Date(reuniao.data_hora).toLocaleString('pt-BR')}</span>}
                {reuniao.duracao && <span style={{ fontFamily: V.mono, fontSize: 10, color: V.text3 }}>{Math.floor(reuniao.duracao / 60)}min</span>}
                {(() => {
                  const isDone = ['processado','done','partial'].includes(reuniao.status ?? '')
                  const isErr  = ['error','erro'].includes(reuniao.status ?? '')
                  return (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 3, fontFamily: V.mono, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', background: isDone ? 'rgba(0,229,160,0.08)' : isErr ? 'rgba(255,68,85,0.08)' : 'rgba(245,158,11,0.1)', color: isDone ? V.accent : isErr ? V.red : V.amber, border: `1px solid ${isDone ? 'rgba(0,229,160,0.15)' : isErr ? 'rgba(255,68,85,0.2)' : 'rgba(245,158,11,0.2)'}` }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
                      {isDone ? 'Analisada' : isErr ? 'Erro na análise' : (reuniao.status ?? 'Processando')}
                    </span>
                  )
                })()}
              </div>
            </div>
            <ReprocessButton meetingId={id} tipo="reuniao" />
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: V.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: V.text3, marginBottom: 8 }}>Avaliação da Reunião</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 1, background: V.border, border: `1px solid ${V.border}`, borderRadius: 5, overflow: 'hidden' }}>
              {CRITERIA.map(c => (
                <div key={c.key} style={{ background: c.main ? V.surface2 : V.surface, padding: '14px 16px', textAlign: 'center' }}>
                  <div style={{ fontFamily: V.mono, fontSize: 8, textTransform: 'uppercase', letterSpacing: '0.1em', color: V.text3, marginBottom: 6 }}>{c.label}</div>
                  <div style={{ fontFamily: V.mono, fontSize: 26, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1, color: scoreColor(c.val) }}>{fmtScore(c.val)}</div>
                  <div style={{ height: 2, background: V.border2, borderRadius: 1, marginTop: 6 }}>
                    {c.val != null && <div style={{ width: `${(c.val / 10) * 100}%`, height: 2, background: scoreColor(c.val), borderRadius: 1 }} />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ padding: '0 32px 40px', paddingTop: 22 }}>
          {audioUrl && (
            <div style={{ marginBottom: 20 }}>
              <AudioPlayer url={audioUrl} filename={reuniao.audio_filename} />
            </div>
          )}
          <MeetingTabs data={tabData} />
        </div>
      </main>
    </div>
  )
}
