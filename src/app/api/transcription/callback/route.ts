import { NextResponse } from 'next/server'

// Transcription is now synchronous via Whisper — this endpoint is no longer active.
export async function POST() {
  return NextResponse.json({ ok: true })
}
