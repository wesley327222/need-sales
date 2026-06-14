/**
 * GET /api/debug
 * GET /api/debug?id=<reuniao_id>
 * GET /api/debug?id=<id>&whisper=1    — also run Whisper test (30-120s)
 * GET /api/debug?id=<id>&gpt=1       — also run quick GPT-4o test
 *
 * Pipeline diagnostic — tests each step and returns detailed JSON.
 * Open in browser: http://localhost:3000/api/debug
 */
import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { openai } from '@/lib/openai'
import { toFile } from 'openai'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const idParam = searchParams.get('id')

  const steps: Record<string, unknown> = {}

  // 1. Environment vars
  steps.env = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY
      ? `set (${process.env.OPENAI_API_KEY.slice(0, 12)}...)`
      : 'MISSING ← FIX THIS',
    SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'MISSING',
    SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'set' : 'MISSING',
    APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? '(not set)',
  }

  // 2. Supabase connection + write test
  let supabase: ReturnType<typeof createServiceClient>
  try {
    supabase = createServiceClient()
    const { count, error } = await supabase
      .from('reunioes')
      .select('*', { count: 'exact', head: true })
    steps.supabase = error
      ? { ok: false, error: error.message, code: error.code }
      : { ok: true, reunioes_count: count }

    // Write test: try status update (simplest column)
    if (idParam) {
      const { error: w1 } = await supabase
        .from('reunioes').update({ status: 'transcribing' }).eq('id', idParam)
      const { error: w2 } = await supabase
        .from('reunioes').update({ transcricao: 'TEST' }).eq('id', idParam)
      const { error: w3 } = await supabase
        .from('reunioes').update({ nota_geral: 5 }).eq('id', idParam)
      // Clean up
      await supabase.from('reunioes').update({ transcricao: null, nota_geral: null }).eq('id', idParam)
      steps.write_test = {
        status_col: w1 ? `ERROR: ${w1.message} (${w1.code})` : 'OK',
        transcricao_col: w2 ? `ERROR: ${w2.message} (${w2.code})` : 'OK',
        nota_geral_col: w3 ? `ERROR: ${w3.message} (${w3.code})` : 'OK',
      }
    }
  } catch (e) {
    steps.supabase = { ok: false, error: String(e) }
    return NextResponse.json(steps)
  }

  // 3. Find target meeting
  let meetingId = idParam
  let audioPath: string | null = null
  let audioFilename: string | null = null

  try {
    const { data, error } = await supabase
      .from('reunioes')
      .select('id, titulo, status, audio_url, audio_filename, nota_geral, transcricao, empresa_id')
      .order('created_at', { ascending: false })
      .limit(5)

    if (error) {
      steps.meetings = { ok: false, error: error.message }
    } else {
      steps.meetings = {
        ok: true,
        rows: (data ?? []).map(r => ({
          id: r.id,
          titulo: r.titulo,
          status: r.status,
          has_audio_url: !!r.audio_url,
          has_transcricao: !!r.transcricao,
          nota_geral: r.nota_geral,
        })),
      }
      const target = idParam ? data?.find(r => r.id === idParam) : data?.[0]
      if (target) {
        meetingId = target.id
        audioPath = target.audio_url
        audioFilename = target.audio_filename
      }
    }
  } catch (e) {
    steps.meetings = { ok: false, error: String(e) }
  }

  steps.target_id = meetingId ?? 'none — no meetings found'

  // 4. Signed URL + audio download check
  if (meetingId && audioPath) {
    try {
      const { data: urlData, error: urlErr } = await supabase.storage
        .from('audio-files')
        .createSignedUrl(audioPath, 120)

      if (urlErr || !urlData?.signedUrl) {
        steps.audio = { ok: false, error: urlErr?.message ?? 'No signed URL returned' }
      } else {
        // Only fetch headers to verify accessibility
        const r = await fetch(urlData.signedUrl, { method: 'HEAD' })
        steps.audio = {
          ok: r.ok,
          http_status: r.status,
          content_type: r.headers.get('content-type'),
          content_length: r.headers.get('content-length'),
          audio_path: audioPath,
          filename: audioFilename,
        }
      }
    } catch (e) {
      steps.audio = { ok: false, error: String(e) }
    }
  } else {
    steps.audio = { ok: false, skipped: true, reason: 'No meeting with audio_url found' }
  }

  // 5. OpenAI key check
  try {
    const models = await openai.models.list()
    const whisperAvail = models.data.some(m => m.id.includes('whisper'))
    const gpt4oAvail   = models.data.some(m => m.id === 'gpt-4o')
    steps.openai = {
      ok: true,
      whisper_1_available: whisperAvail,
      gpt4o_available: gpt4oAvail,
      total_models: models.data.length,
    }
  } catch (e: unknown) {
    const err = e as { status?: number; message?: string; code?: string }
    steps.openai = {
      ok: false,
      http_status: err?.status,
      code: err?.code,
      error: err?.message ?? String(e),
    }
  }

  // 6. Optional: quick GPT-4o call
  if (searchParams.get('gpt') === '1') {
    try {
      const t0 = Date.now()
      const res = await openai.chat.completions.create({
        model: 'gpt-4o',
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: 'Return {"ok":true}' }],
        max_tokens: 20,
      })
      steps.gpt4o_test = {
        ok: true,
        elapsed_ms: Date.now() - t0,
        response: res.choices[0]?.message?.content,
      }
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string }
      steps.gpt4o_test = { ok: false, http_status: err?.status, error: err?.message ?? String(e) }
    }
  } else {
    steps.gpt4o_test = { skipped: true, hint: 'append &gpt=1 to run' }
  }

  // 7. Optional: full Whisper test
  if (searchParams.get('whisper') === '1' && meetingId && audioPath) {
    try {
      const { data: urlData, error: urlErr } = await supabase.storage
        .from('audio-files')
        .createSignedUrl(audioPath, 3600)

      if (urlErr || !urlData?.signedUrl) throw new Error('Signed URL failed: ' + urlErr?.message)

      const audioRes = await fetch(urlData.signedUrl)
      if (!audioRes.ok) throw new Error(`Download failed: HTTP ${audioRes.status}`)

      const buf = await audioRes.arrayBuffer()
      const fname = audioFilename ?? audioPath.split('/').pop() ?? 'audio.mp3'

      const t0 = Date.now()
      const transcription = await openai.audio.transcriptions.create({
        file: await toFile(Buffer.from(buf), fname, {
          type: audioRes.headers.get('content-type') ?? 'audio/mpeg',
        }),
        model: 'whisper-1',
        language: 'pt',
        response_format: 'text',
      })
      const text = typeof transcription === 'string' ? transcription : (transcription as { text: string }).text
      steps.whisper_test = {
        ok: true,
        elapsed_ms: Date.now() - t0,
        file_bytes: buf.byteLength,
        text_chars: text.length,
        preview: text.slice(0, 300) + (text.length > 300 ? '…' : ''),
      }
    } catch (e: unknown) {
      const err = e as { status?: number; message?: string }
      steps.whisper_test = { ok: false, http_status: err?.status, error: err?.message ?? String(e) }
    }
  } else if (!audioPath) {
    steps.whisper_test = { skipped: true, reason: 'No audio file found' }
  } else {
    steps.whisper_test = { skipped: true, hint: 'append &whisper=1 to run (takes 30-120s)' }
  }

  // Summary
  const okMap = Object.entries(steps)
    .filter(([k]) => !['_links', 'target_id'].includes(k))
    .map(([k, v]) => {
      const val = v as Record<string, unknown>
      return { step: k, ok: val?.skipped ? 'skipped' : val?.ok }
    })

  steps._links = {
    quick_check: `/api/debug`,
    with_gpt: `/api/debug?gpt=1`,
    with_whisper: `/api/debug?id=${meetingId}&whisper=1`,
    full: `/api/debug?id=${meetingId}&gpt=1&whisper=1`,
    reprocess: meetingId ? `/api/meetings/${meetingId}/process (POST)` : null,
  }
  steps._ok_summary = okMap

  return NextResponse.json(steps, {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}
