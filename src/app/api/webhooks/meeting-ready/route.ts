import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

/**
 * Webhook chamado por automação externa (n8n) quando uma reunião já tem
 * transcrição/empresa/vendedor/url preenchidos e está pronta para a IA analisar.
 *
 * Body: { "call_uuid": "<id-da-reuniao>" }
 * Header: Authorization: Bearer <INTERNAL_WEBHOOK_TOKEN>
 *
 * Não preenche transcrição/url/etc — esses dados já chegam preenchidos.
 * Apenas dispara o processo padrão de análise (mesma IA do upload manual),
 * que grava as notas/insights e muda o status para 'processado'.
 */
export async function POST(request: Request) {
  // 1. Validar token de autorização
  const expectedToken = process.env.INTERNAL_WEBHOOK_TOKEN
  if (!expectedToken) {
    console.error('[meeting-ready] INTERNAL_WEBHOOK_TOKEN não configurado no ambiente')
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const authHeader = request.headers.get('authorization')
  const token = authHeader?.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : null

  if (!token || token !== expectedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Validar body
  let body: { call_uuid?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const callUuid = body.call_uuid?.trim()
  if (!callUuid) {
    return NextResponse.json({ error: 'call_uuid é obrigatório' }, { status: 400 })
  }

  // 3. Confirmar que a reunião existe e tem transcrição
  const supabase = createServiceClient()
  const { data: reuniao } = await supabase
    .from('reunioes')
    .select('id, transcricao, status')
    .eq('id', callUuid)
    .maybeSingle()

  if (!reuniao) {
    return NextResponse.json({ error: 'Reunião não encontrada' }, { status: 404 })
  }

  if (!reuniao.transcricao?.trim()) {
    return NextResponse.json({ error: 'Reunião sem transcrição para analisar' }, { status: 400 })
  }

  // Evitar reprocessamento concorrente
  if (reuniao.status === 'processing') {
    return NextResponse.json({ id: callUuid, status: 'processing', message: 'Já em processamento' }, { status: 200 })
  }

  // 4. Disparar o processo padrão de análise (reusa o endpoint existente)
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin
  try {
    const res = await fetch(`${baseUrl}/api/meetings/${callUuid}/process-agents`, { method: 'POST' })
    const result = await res.json().catch(() => ({}))

    if (!res.ok) {
      console.error(`[meeting-ready] process-agents falhou para ${callUuid}:`, result)
      return NextResponse.json({ error: 'Falha na análise', detail: result }, { status: 502 })
    }

    console.log(`[meeting-ready] reunião ${callUuid} analisada — status: ${result.status}`)
    return NextResponse.json({ ok: true, ...result }, { status: 200 })
  } catch (err) {
    console.error(`[meeting-ready] erro ao disparar análise para ${callUuid}:`, err)
    return NextResponse.json({ error: 'Erro interno ao processar' }, { status: 500 })
  }
}
