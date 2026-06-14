const NYLAS_BASE = 'https://api.us.nylas.com/v3'

function nylasHeaders() {
  return {
    Authorization: `Bearer ${process.env.NYLAS_API_KEY}`,
    'Content-Type': 'application/json',
  }
}

export interface NotetakerResult {
  id: string
  state: string
  meetingLink: string
}

/** Send the Nylas bot to a Google Meet. join_time is a Unix timestamp (seconds). */
export async function createNotetaker(
  meetingLink: string,
  joinTime: number,
  name = 'NeedSales'
): Promise<NotetakerResult> {
  const res = await fetch(`${NYLAS_BASE}/notetakers`, {
    method: 'POST',
    headers: nylasHeaders(),
    body: JSON.stringify({
      meeting_link: meetingLink,
      join_time:    joinTime,
      name,
    }),
  })
  if (!res.ok) throw new Error(`Nylas createNotetaker failed: ${await res.text()}`)
  const data = await res.json()
  return {
    id:          data.data?.id ?? data.id,
    state:       data.data?.state ?? data.state,
    meetingLink: data.data?.meeting_link ?? meetingLink,
  }
}

export interface TranscriptSegment {
  start_time: number
  end_time:   number
  text:       string
  speaker:    string
}

/** Fetch and format the transcript for a notetaker. */
export async function getNotetakerTranscript(notetakerId: string): Promise<string> {
  const res = await fetch(`${NYLAS_BASE}/notetakers/${notetakerId}/transcript`, {
    headers: nylasHeaders(),
  })
  if (!res.ok) throw new Error(`Nylas getTranscript failed: ${await res.text()}`)
  const data = await res.json()

  const segments: TranscriptSegment[] = data.data ?? []
  if (!segments.length) return ''

  return segments
    .map(s => `[${s.speaker ?? 'Desconhecido'}]: ${s.text}`)
    .join('\n')
}

/** Verify a Nylas webhook HMAC signature. */
export async function verifyNylasSignature(
  body: string,
  signature: string | null
): Promise<boolean> {
  const secret = process.env.NYLAS_WEBHOOK_SECRET
  if (!secret) return true // skip in dev if not configured

  if (!signature) return false

  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const mac = await crypto.subtle.sign('HMAC', key, enc.encode(body))
  const expected = Array.from(new Uint8Array(mac)).map(b => b.toString(16).padStart(2, '0')).join('')
  return expected === signature
}
