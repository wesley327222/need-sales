import type { CriterioResultadoDisplay } from '@/components/vendor/meeting-tabs'
import type { Json } from '@/lib/types/database'

interface RawEntry {
  label?: string
  obrigatorio?: boolean
  nota?: number
  justificativa?: string
  evidencias?: string[]
  sugestoes?: string[]
  objecoes?: CriterioResultadoDisplay['objecoes']
  S?: { valor: number; evidencias?: string[]; justificativa?: string; sugestoes?: string[] }
  P?: { valor: number; evidencias?: string[]; justificativa?: string; sugestoes?: string[] }
  I?: { valor: number; evidencias?: string[]; justificativa?: string; sugestoes?: string[] }
  N?: { valor: number; evidencias?: string[]; justificativa?: string; sugestoes?: string[] }
}

/** Converte a coluna `criterios_resultado` (jsonb autodescritivo) em formato de exibição. */
export function mapCriteriosResultado(raw: Json | null | undefined): CriterioResultadoDisplay[] | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null

  const entries = Object.entries(raw as Record<string, unknown>)
  if (!entries.length) return null

  return entries.map(([key, value]) => {
    const entry = (value ?? {}) as RawEntry
    const display: CriterioResultadoDisplay = {
      key,
      label: entry.label ?? key,
      obrigatorio: entry.obrigatorio ?? false,
      nota: typeof entry.nota === 'number' ? entry.nota : 0,
      justificativa: entry.justificativa ?? '',
      evidencias: Array.isArray(entry.evidencias) ? entry.evidencias : [],
      sugestoes: Array.isArray(entry.sugestoes) ? entry.sugestoes : [],
    }
    if (Array.isArray(entry.objecoes)) display.objecoes = entry.objecoes

    if (key === 'spin_selling' && entry.S && entry.P && entry.I && entry.N) {
      const dim = (d: NonNullable<RawEntry['S']>) => ({
        score: d.valor, evidencias: d.evidencias ?? [], justificativa: d.justificativa ?? '', sugestoes: d.sugestoes ?? [],
      })
      display.spinBreakdown = { S: dim(entry.S), P: dim(entry.P), I: dim(entry.I), N: dim(entry.N) }
    }

    return display
  })
}

export interface ScorecardItem {
  key: string
  label: string
  val: number | null
  main: boolean
}

/** Monta a linha de scorecard (Nota Geral + um item por critério ativo) a partir do formato novo. */
export function buildDynamicScorecard(notaGeral: number | null, criterios: CriterioResultadoDisplay[]): ScorecardItem[] {
  return [
    { key: 'geral', label: 'Nota Geral', val: notaGeral, main: true },
    ...criterios.map(c => ({ key: c.key, label: c.label, val: c.nota, main: false })),
  ]
}
