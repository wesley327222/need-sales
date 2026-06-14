export const V = {
  bg:        '#0A0A0B',
  surface:   '#111113',
  surface2:  '#18181B',
  border:    '#1E1E22',
  border2:   '#2A2A30',
  text1:     '#F0F0F4',
  text2:     '#8A8A96',
  text3:     '#4A4A56',
  accent:    '#00E5A0',
  accentDim: 'rgba(0,229,160,0.08)',
  red:       '#FF4455',
  amber:     '#F59E0B',
  blue:      '#4F8EF7',
  ui:        "'Space Grotesk', system-ui, sans-serif",
  mono:      "'JetBrains Mono', monospace",
} as const

export function scoreColor(s: number | null | undefined): string {
  if (s == null) return V.text3
  if (s >= 7.5) return V.accent
  if (s >= 6)   return V.amber
  return V.red
}

export function fmtScore(s: number | null | undefined): string {
  if (s == null) return '—'
  return s.toFixed(1)
}
