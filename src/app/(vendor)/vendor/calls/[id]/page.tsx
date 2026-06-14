import { notFound, redirect } from 'next/navigation'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { VendorSidebar } from '@/components/vendor/sidebar'
import { MeetingTabs, type MeetingTabData } from '@/components/vendor/meeting-tabs'
import { AudioPlayer } from '@/components/vendor/audio-player'
import { V, scoreColor, fmtScore } from '@/components/vendor/colors'
import type { ObjecaoAvaliada } from '@/lib/types/agents'

interface Props {
  params: Promise<{ id: string }>
}

export default async function VendorCallDetail({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const service = createServiceClient()
  const { data: profile } = await service.from('profiles').select('nome, role').eq('id', user.id).single()
  const initials = (profile?.nome ?? 'V').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)

  const { data: ligacao, error } = await service
    .from('ligacoes')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !ligacao) notFound()

  const { data: audioData } = ligacao.audio_url
    ? await service.storage.from('audio-files').createSignedUrl(ligacao.audio_url, 3600)
    : { data: null }
  const audioUrl = audioData?.signedUrl ?? null

  const objecoesArr = Array.isArray(ligacao.objecoes) ? (ligacao.objecoes as unknown as ObjecaoAvaliada[]) : []

  type InsightsDb = { positivos?: string[]; melhorias?: string[] } | string[]
  const insightsRaw = ligacao.insights as InsightsDb | null
  const insightsObj = insightsRaw
    ? Array.isArray(insightsRaw)
      ? { positivos: (insightsRaw as string[]).slice(0, 3), melhorias: (insightsRaw as string[]).slice(3) }
      : { positivos: insightsRaw.positivos ?? [], melhorias: insightsRaw.melhorias ?? [] }
    : null
  const insights: MeetingTabData['insights'] =
    insightsObj && (insightsObj.positivos.length > 0 || insightsObj.melhorias.length > 0) ? insightsObj : null

  const followups: MeetingTabData['followups'] = []
  if (ligacao.follow_whatsapp_d1) {
    followups.push({ canal: 'whatsapp', timing: 'D+1', assunto: null, mensagem: ligacao.follow_whatsapp_d1 })
  }
  if (ligacao.follow_whatsapp_d3) {
    followups.push({ canal: 'whatsapp', timing: 'D+3', assunto: null, mensagem: ligacao.follow_whatsapp_d3 })
  }
  if (ligacao.follow_email_5) {
    const lines = ligacao.follow_email_5.split('\n\n')
    const assunto = lines[0] ?? null
    const mensagem = lines.slice(1).join('\n\n') || ligacao.follow_email_5
    followups.push({ canal: 'email', timing: 'D+5', assunto, mensagem })
  }

  const tabData: MeetingTabData = {
    transcription: ligacao.transcricao,
    duration_seconds: ligacao.duracao,
    insights,
    objecoes: objecoesArr.map(o => ({
      numero: o.numero,
      texto: o.texto,
      status: o.status,
      como_tratou: o.como_tratou,
      sugestao_quebra: o.sugestao_quebra,
    })),
    followups,
    relatorioNotas: null,
    spin: null,
    proposta: ligacao.follow_email_5 ?? null,
  }

  const CRITERIA = [
    { key: 'geral',               label: 'Nota Geral',         val: ligacao.nota_geral,               main: true },
    { key: 'acesso_decisor',      label: 'Acesso Decisor',     val: ligacao.nota_acesso_decisor,      main: false },
    { key: 'qualificacao_lead',   label: 'Expl. Motivo',       val: ligacao.nota_qualificacao_lead,   main: false },
    { key: 'geracao_curiosidade', label: 'Geração Curiosidade', val: ligacao.nota_geracao_curiosidade, main: false },
    { key: 'conducao_conversa',   label: 'Condução Conv.',     val: ligacao.nota_conducao_conversa,   main: false },
    { key: 'pedido_reuniao',      label: 'Pedido Reunião',     val: ligacao.nota_pedido_reuniao,      main: false },
  ]

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <VendorSidebar userName={profile?.nome ?? ''} userInitials={initials} userRole={profile?.role ?? 'seller'} />

      <main style={{ flex: 1, overflowY: 'auto', background: V.bg }}>
        <div style={{ background: V.surface, borderBottom: `1px solid ${V.border}`, padding: '20px 32px 0' }}>
          <a href="/vendor/calls" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: V.mono, fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.08em', color: V.text3, textDecoration: 'none', marginBottom: 14 }}>
            ‹ Minhas Ligações
          </a>

          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 4 }}>{ligacao.titulo}</h1>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                {ligacao.data_hora && <span style={{ fontFamily: V.mono, fontSize: 10, color: V.text3 }}>{new Date(ligacao.data_hora).toLocaleString('pt-BR')}</span>}
                {ligacao.duracao && <span style={{ fontFamily: V.mono, fontSize: 10, color: V.text3 }}>{Math.floor(ligacao.duracao / 60)}min</span>}
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 8px', borderRadius: 3, fontFamily: V.mono, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', background: ligacao.status === 'processado' ? 'rgba(0,229,160,0.08)' : 'rgba(245,158,11,0.1)', color: ligacao.status === 'processado' ? V.accent : V.amber, border: `1px solid ${ligacao.status === 'processado' ? 'rgba(0,229,160,0.15)' : 'rgba(245,158,11,0.2)'}` }}>
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor' }} />
                  {ligacao.status === 'processado' ? 'Analisada' : ligacao.status}
                </span>
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontFamily: V.mono, fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: V.text3, marginBottom: 8 }}>Avaliação da Ligação</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 1, background: V.border, border: `1px solid ${V.border}`, borderRadius: 5, overflow: 'hidden' }}>
              {CRITERIA.map(c => (
                <div key={c.key} style={{ background: c.main ? V.surface2 : V.surface, padding: '14px 12px', textAlign: 'center' }}>
                  <div style={{ fontFamily: V.mono, fontSize: 7, textTransform: 'uppercase', letterSpacing: '0.08em', color: V.text3, marginBottom: 6 }}>{c.label}</div>
                  <div style={{ fontFamily: V.mono, fontSize: 24, fontWeight: 700, letterSpacing: '-0.04em', lineHeight: 1, color: scoreColor(c.val) }}>{fmtScore(c.val)}</div>
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
              <AudioPlayer url={audioUrl} filename={ligacao.audio_filename} />
            </div>
          )}
          <MeetingTabs data={tabData} />
        </div>
      </main>
    </div>
  )
}
