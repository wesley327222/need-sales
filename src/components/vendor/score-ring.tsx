import { scoreColor, fmtScore, V } from './colors'

interface ScoreRingProps {
  score: number | null
  size?: number
}

export function ScoreRing({ score, size = 44 }: ScoreRingProps) {
  const pct = score != null ? Math.min(score / 10, 1) : 0
  const r = size / 2 - 3.5
  const circ = 2 * Math.PI * r
  const dash = pct * circ
  const color = scoreColor(score)
  const label = fmtScore(score)
  const fontSize = score == null ? 11 : 10
  const cx = size / 2

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={V.border2} strokeWidth="2.5" />
      <circle
        cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth="2.5"
        strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cx})`}
      />
      <text
        x={cx} y={cx + 1} textAnchor="middle" dominantBaseline="middle"
        fill={color} fontFamily={V.mono} fontSize={fontSize} fontWeight="700"
      >
        {label}
      </text>
    </svg>
  )
}
