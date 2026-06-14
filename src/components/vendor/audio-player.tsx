'use client'

import { useRef, useState, useEffect, useCallback } from 'react'
import { V } from './colors'

interface AudioPlayerProps {
  url: string
  filename?: string | null
}

function fmt(s: number) {
  if (!s || isNaN(s)) return '0:00'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

const SPEEDS = [1, 1.25, 1.5, 2]

export function AudioPlayer({ url, filename }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const barRef   = useRef<HTMLDivElement>(null)
  const [playing,     setPlaying]     = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration,    setDuration]    = useState(0)
  const [speedIdx,    setSpeedIdx]    = useState(0)
  const [muted,       setMuted]       = useState(false)
  const [loading,     setLoading]     = useState(true)

  const speed = SPEEDS[speedIdx]
  const pct   = duration ? (currentTime / duration) * 100 : 0

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const handlers: [string, () => void][] = [
      ['play',          () => setPlaying(true)],
      ['pause',         () => setPlaying(false)],
      ['ended',         () => { setPlaying(false); setCurrentTime(0) }],
      ['timeupdate',    () => setCurrentTime(audio.currentTime)],
      ['loadedmetadata',() => { setDuration(audio.duration); setLoading(false) }],
      ['canplay',       () => setLoading(false)],
      ['waiting',       () => setLoading(true)],
      ['playing',       () => setLoading(false)],
    ]
    handlers.forEach(([ev, fn]) => audio.addEventListener(ev, fn))
    return () => handlers.forEach(([ev, fn]) => audio.removeEventListener(ev, fn))
  }, [])

  function togglePlay() {
    const a = audioRef.current
    if (!a) return
    playing ? a.pause() : a.play()
  }

  function toggleMute() {
    const a = audioRef.current
    if (!a) return
    a.muted = !a.muted
    setMuted(a.muted)
  }

  function cycleSpeed() {
    const next = (speedIdx + 1) % SPEEDS.length
    setSpeedIdx(next)
    if (audioRef.current) audioRef.current.playbackRate = SPEEDS[next]
  }

  const seek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current
    const bar = barRef.current
    if (!a || !bar || !duration) return
    const rect = bar.getBoundingClientRect()
    const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    a.currentTime = pct * duration
    setCurrentTime(a.currentTime)
  }, [duration])

  function skip(secs: number) {
    const a = audioRef.current
    if (!a) return
    a.currentTime = Math.max(0, Math.min(duration, a.currentTime + secs))
  }

  return (
    <div style={{
      background: V.surface2, border: `1px solid ${V.border}`, borderRadius: 6,
      padding: '14px 18px', fontFamily: V.ui,
    }}>
      <audio ref={audioRef} src={url} preload="metadata" />

      {/* File label */}
      {filename && (
        <div style={{
          fontFamily: V.mono, fontSize: 9, textTransform: 'uppercase',
          letterSpacing: '0.08em', color: V.text3, marginBottom: 10,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {filename}
        </div>
      )}

      {/* Controls row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>

        {/* Skip back 10s */}
        <button onClick={() => skip(-10)} title="Voltar 10s" style={btnStyle(false)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11.99 5V1l-5 5 5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6h-2c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8zm-1.1 11h-.85v-3.26l-1.01.31v-.69l1.77-.63h.09V16zm4.28-1.93c0 .55-.07.97-.2 1.28-.13.31-.34.46-.63.46s-.49-.15-.62-.46c-.13-.31-.2-.73-.2-1.28v-.76c0-.55.07-.97.2-1.27.13-.31.34-.46.63-.46s.49.15.62.46c.13.31.2.72.2 1.27v.76zm-.85-1.05c0-.32-.03-.56-.08-.73-.05-.17-.14-.25-.27-.25-.12 0-.21.08-.26.25-.05.17-.08.41-.08.73v1.17c0 .33.03.57.08.74.05.17.14.25.27.25s.22-.08.27-.25c.05-.17.07-.41.07-.74v-1.17z"/>
          </svg>
        </button>

        {/* Play / Pause */}
        <button onClick={togglePlay} style={{
          width: 38, height: 38, borderRadius: '50%', border: 'none',
          background: V.accent, color: '#000', cursor: 'pointer', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          opacity: loading ? 0.6 : 1,
        }}>
          {loading
            ? <span style={{ fontSize: 12 }}>...</span>
            : playing
              ? <svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor"><rect x="0" y="0" width="4" height="14"/><rect x="8" y="0" width="4" height="14"/></svg>
              : <svg width="12" height="14" viewBox="0 0 12 14" fill="currentColor"><polygon points="0,0 12,7 0,14"/></svg>
          }
        </button>

        {/* Skip forward 10s */}
        <button onClick={() => skip(10)} title="Avançar 10s" style={btnStyle(false)}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.01 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8zm-1.1 11h-.85v-3.26l-1.01.31v-.69l1.77-.63h.09V16zm4.28-1.93c0 .55-.07.97-.2 1.28-.13.31-.34.46-.63.46s-.49-.15-.62-.46c-.13-.31-.2-.73-.2-1.28v-.76c0-.55.07-.97.2-1.27.13-.31.34-.46.63-.46s.49.15.62.46c.13.31.2.72.2 1.27v.76zm-.85-1.05c0-.32-.03-.56-.08-.73-.05-.17-.14-.25-.27-.25-.12 0-.21.08-.26.25-.05.17-.08.41-.08.73v1.17c0 .33.03.57.08.74.05.17.14.25.27.25s.22-.08.27-.25c.05-.17.07-.41.07-.74v-1.17z"/>
          </svg>
        </button>

        {/* Progress bar */}
        <div ref={barRef} onClick={seek} style={{
          flex: 1, height: 4, background: V.border2, borderRadius: 2,
          cursor: 'pointer', position: 'relative',
        }}>
          {/* Played */}
          <div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            width: `${pct}%`, background: V.accent, borderRadius: 2,
          }} />
          {/* Thumb */}
          <div style={{
            position: 'absolute', top: '50%', left: `${pct}%`,
            transform: 'translate(-50%, -50%)',
            width: 10, height: 10, borderRadius: '50%',
            background: V.accent, boxShadow: `0 0 0 2px ${V.surface2}`,
          }} />
        </div>

        {/* Time */}
        <div style={{ fontFamily: V.mono, fontSize: 10, color: V.text3, flexShrink: 0, minWidth: 72, textAlign: 'right' }}>
          {fmt(currentTime)} / {fmt(duration)}
        </div>

        {/* Speed */}
        <button onClick={cycleSpeed} style={btnStyle(speed !== 1)} title="Velocidade">
          <span style={{ fontFamily: V.mono, fontSize: 10 }}>{speed}x</span>
        </button>

        {/* Mute */}
        <button onClick={toggleMute} title={muted ? 'Ativar som' : 'Mudo'} style={btnStyle(muted)}>
          {muted
            ? <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3.63 3.63a.996.996 0 000 1.41L7.29 8.7 7 9H3v6h4l5 5v-6.73l4.25 4.26c-.67.51-1.42.93-2.25 1.17v2.07c1.38-.31 2.63-.95 3.69-1.81L19.96 21a.996.996 0 101.41-1.41L5.05 3.63a.996.996 0 00-1.42 0zM19 12c0 .82-.15 1.61-.41 2.34l1.53 1.53c.56-1.17.88-2.48.88-3.87 0-3.83-2.4-7.11-5.78-8.4-.59-.23-1.22.23-1.22.86v.19c0 .38.25.71.61.85C17.18 6.54 19 9.06 19 12zm-8.71-6.29l-.17.17L12 7.76V6.41c0-.89-1.08-1.33-1.71-.7zM16.5 12A4.5 4.5 0 0014 7.97v1.79l2.48 2.48c.01-.08.02-.16.02-.24z"/></svg>
            : <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>
          }
        </button>
      </div>
    </div>
  )
}

function btnStyle(active: boolean): React.CSSProperties {
  return {
    background: active ? V.accentDim : 'none',
    border: `1px solid ${active ? V.accent : V.border2}`,
    borderRadius: 4, padding: '4px 7px',
    color: active ? V.accent : V.text3,
    cursor: 'pointer', flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }
}
