import { Mp3Encoder } from '@breezystack/lamejs'

/**
 * Upload direto para o Supabase Storage via XHR para suporte a progresso real.
 * O Supabase JS SDK não expõe eventos de progresso de upload.
 */
export async function uploadToStorage(
  file: File,
  storagePath: string,
  token: string,
  onProgress: (pct: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/audio-files/${storagePath}`

    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)
    xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
    xhr.setRequestHeader('x-upsert', 'false')

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve()
      } else {
        reject(new Error(`Erro no upload (${xhr.status}): ${xhr.responseText}`))
      }
    }

    xhr.onerror = () => reject(new Error('Falha de conexão durante o upload'))
    xhr.send(file)
  })
}

const ACCEPTED_TYPES = ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-m4a', 'video/mp4', 'audio/ogg', 'audio/webm']
const ACCEPTED_EXTENSIONS = ['.mp3', '.mp4', '.m4a', '.wav', '.ogg', '.webm']

export function isValidAudioFile(file: File): boolean {
  return ACCEPTED_TYPES.includes(file.type) || ACCEPTED_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext))
}

/** 45 MB — safe headroom below the Supabase free-tier 50 MB per-object limit */
export const MAX_UPLOAD_BYTES = 45 * 1024 * 1024

/**
 * Extract audio from a video (or oversized audio) file without pitch distortion.
 *
 * Strategy:
 *  1. Read the file into an ArrayBuffer (fast).
 *  2. Decode with AudioContext.decodeAudioData — the browser's native decoder strips
 *     the video track and returns raw PCM samples at the file's original pitch/speed.
 *  3. Encode the PCM samples as 128 kbps mono MP3 using lamejs (pure-JS, ~10× faster
 *     than real-time on modern CPUs).
 *
 * Output: MP3 at 128 kbps mono.  A 60-minute meeting ≈ 57 MB → ~58 MB WAV input →
 * ~57 MB MP3 ... that's still too large? No: at 128 kbps mono, 60 min = 57.6 MB.
 * Use 64 kbps for speech: 60 min = 28.8 MB, well under the 45 MB limit.
 */
export async function extractAudioFromVideo(
  file: File,
  onProgress: (pct: number) => void,
): Promise<File> {
  // Step 1 — read entire file into memory
  onProgress(2)
  const arrayBuffer = await file.arrayBuffer()
  onProgress(10)

  // Step 2 — decode audio track (ignores video stream, preserves pitch)
  const AudioContextCtor =
    window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const ctx = new AudioContextCtor()
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0))
  await ctx.close()
  onProgress(35)

  // Step 3 — downsample to mono at the decoded sample rate and encode as MP3
  const sampleRate = audioBuffer.sampleRate
  const left  = audioBuffer.getChannelData(0)
  const right  = audioBuffer.numberOfChannels > 1 ? audioBuffer.getChannelData(1) : left

  const BITRATE   = 64        // kbps — 64 kbps is plenty for speech recognition
  const CHUNK     = 1152      // MP3 frame size required by lame
  const encoder   = new Mp3Encoder(1, sampleRate, BITRATE)
  const mp3Parts: Uint8Array[] = []

  const total = left.length
  for (let i = 0; i < total; i += CHUNK) {
    const end  = Math.min(i + CHUNK, total)
    const mono = new Int16Array(end - i)
    for (let j = 0; j < mono.length; j++) {
      // Mix stereo to mono, clamp to Int16 range
      const sample = (left[i + j] + right[i + j]) / 2
      mono[j] = Math.max(-32768, Math.min(32767, Math.round(sample * 32767)))
    }
    const encoded = encoder.encodeBuffer(mono)
    if (encoded.length > 0) mp3Parts.push(new Uint8Array(encoded.buffer))
    if (i % (CHUNK * 200) === 0) {
      onProgress(35 + Math.round((i / total) * 60))
      // yield to keep UI responsive
      await new Promise(r => setTimeout(r, 0))
    }
  }

  const flushed = encoder.flush()
  if (flushed.length > 0) mp3Parts.push(new Uint8Array(flushed.buffer))
  onProgress(99)

  const blob     = new Blob(mp3Parts as BlobPart[], { type: 'audio/mpeg' })
  const filename = file.name.replace(/\.[^.]+$/, '.mp3')
  onProgress(100)
  return new File([blob], filename, { type: 'audio/mpeg' })
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}
