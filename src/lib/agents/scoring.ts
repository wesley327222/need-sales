export interface ScoredCriterion {
  key: string
  nota: number
  peso: number  // 1-5
}

/** Média ponderada pelos pesos configurados. Retorna null se não houver critérios válidos. */
export function weightedAverage(items: ScoredCriterion[]): number | null {
  const valid = items.filter(i => i.nota != null && Number.isFinite(i.nota))
  if (!valid.length) return null

  const totalWeight = valid.reduce((s, i) => s + i.peso, 0)
  if (totalWeight === 0) return null

  const sum = valid.reduce((s, i) => s + i.nota * i.peso, 0)
  return Math.round((sum / totalWeight) * 10) / 10
}
