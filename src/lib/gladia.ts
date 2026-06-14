export interface GladiaUtterance {
  start: number
  end: number
  speaker: number
  channel: number
  text: string
  words?: unknown[]
}

export interface GladiaTranscriptionResult {
  id: string
  status: 'done' | 'error' | 'queued' | 'processing'
  result?: {
    metadata?: {
      audio_duration?: number
    }
    transcription?: {
      full_transcript?: string
      utterances?: GladiaUtterance[]
    }
  }
  error_code?: string
}

export function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// Mapeia speaker index → label (0 = vendedor, 1+ = cliente/outros)
export function speakerLabel(speakerIndex: number): string {
  return speakerIndex === 0 ? 'VENDEDOR' : 'CLIENTE'
}

export function buildTranscriptPlain(utterances: GladiaUtterance[]): string {
  return utterances.map(u => u.text).join('\n')
}

export function buildTranscriptFormatted(utterances: GladiaUtterance[]): string {
  return utterances
    .map(u => `${speakerLabel(u.speaker)} [${formatTimestamp(u.start)}]: ${u.text}`)
    .join('\n')
}
