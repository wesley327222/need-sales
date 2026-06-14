import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { getNotetakerTranscript, verifyNylasSignature } from '@/lib/nylas/notetaker'

export async function POST(request: Request) {
  const rawBody = await request.text()
  const signature = request.headers.get('X-Nylas-Signature')

  const valid = await verifyNylasSignature(rawBody, signature)
  if (!valid) {
    console.error('[nylas] Invalid webhook signature')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const type = payload.type as string
  if (type !== 'notetaker.updated') {
    return new NextResponse(null, { status: 200 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const obj       = (payload.data as any)?.object as Record<string, unknown>
  const notetakerId = obj?.id as string | undefined
  const state       = obj?.state as string | undefined

  if (!notetakerId) {
    return new NextResponse(null, { status: 200 })
  }

  console.log(`[nylas] notetaker ${notetakerId} state: ${state}`)

  // Only process when media/transcript is ready
  if (state !== 'media_available') {
    return new NextResponse(null, { status: 200 })
  }

  const supabase = createServiceClient()

  // Find the reuniao linked to this notetaker
  const { data: reuniao } = await supabase
    .from('reunioes')
    .select('id, empresa_id, status')
    .eq('nylas_notetaker_id', notetakerId)
    .maybeSingle()

  if (!reuniao) {
    console.error(`[nylas] No reuniao found for notetaker ${notetakerId}`)
    return new NextResponse(null, { status: 200 })
  }

  // Avoid reprocessing
  if (['processing', 'processado', 'partial'].includes(reuniao.status ?? '')) {
    console.log(`[nylas] reuniao ${reuniao.id} already processed`)
    return new NextResponse(null, { status: 200 })
  }

  // Fetch transcript from Nylas
  let transcricao: string
  try {
    transcricao = await getNotetakerTranscript(notetakerId)
  } catch (err) {
    console.error(`[nylas] getTranscript failed for ${notetakerId}:`, err)
    await supabase.from('reunioes').update({ status: 'error' }).eq('id', reuniao.id)
    return new NextResponse(null, { status: 200 })
  }

  if (!transcricao.trim()) {
    console.warn(`[nylas] Empty transcript for notetaker ${notetakerId}`)
    await supabase.from('reunioes').update({ status: 'error' }).eq('id', reuniao.id)
    return new NextResponse(null, { status: 200 })
  }

  // Save transcript and trigger AI agents (skip Whisper — transcript already available)
  await supabase
    .from('reunioes')
    .update({ transcricao, status: 'transcribing' })
    .eq('id', reuniao.id)

  console.log(`[nylas] Transcript saved for reuniao ${reuniao.id} (${transcricao.length} chars) — triggering agents`)

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  fetch(`${baseUrl}/api/meetings/${reuniao.id}/process-agents`, { method: 'POST' })
    .then(r => console.log(`[nylas] process-agents for ${reuniao.id}: ${r.status}`))
    .catch(err => console.error(`[nylas] process-agents fire failed:`, err))

  return new NextResponse(null, { status: 200 })
}
