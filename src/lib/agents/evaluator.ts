import { runWithRetry } from './pipeline'
import { runQuebraObjecoes } from './criteria/quebra-objecoes'
import { runEscutaAtiva } from './criteria/escuta-ativa'
import { runApresentacao } from './criteria/apresentacao'
import { runFirmeza } from './criteria/firmeza'
import { runRapport } from './criteria/rapport'
import { runUrgencia } from './criteria/urgencia'
import { runInsightsSynthesis, type CriterionFinding } from './criteria/insights'
import type { AiConfig } from '@/lib/ai-config'
import type { CriterionDef } from '@/lib/criteria-definitions'
import type { EvaluatorResult, CriterioGenericoResult } from '@/lib/types/agents'

type OptionalRunner = (transcricao: string, conhecimentos?: string | null) => Promise<CriterioGenericoResult>

const OPTIONAL_RUNNERS: Record<string, OptionalRunner> = {
  escuta_ativa: runEscutaAtiva,
  apresentacao: runApresentacao,
  firmeza:      runFirmeza,
  rapport:      runRapport,
  urgencia:     runUrgencia,
}

/**
 * Orquestra um agente especialista por critério (cada um com prompt e chamada
 * próprios, em paralelo) em vez de pedir vários critérios numa única chamada —
 * evita que a IA perca nuance ao avaliar habilidades distintas de uma vez só
 * contra uma transcrição longa.
 */
export async function runEvaluator(
  transcricao: string,
  activeOptional: CriterionDef[],
  customConfig?: AiConfig | null
): Promise<EvaluatorResult> {
  const conhecimentos = customConfig?.conhecimentos ?? null

  const quebraPromise = runWithRetry(
    () => runQuebraObjecoes(transcricao, conhecimentos),
    'quebra_objecoes',
  )

  const optionalPromises = activeOptional.map(def => {
    const runner = OPTIONAL_RUNNERS[def.key]
    if (!runner) {
      console.warn(`[evaluator] nenhum agente registrado para o critério opcional "${def.key}", ignorando`)
      return Promise.resolve(null)
    }
    return runWithRetry(() => runner(transcricao, conhecimentos), def.key)
      .then(result => ({ key: def.key, label: def.label, result }))
  })

  const [quebraResult, ...optionalResults] = await Promise.all([quebraPromise, ...optionalPromises])

  if (!quebraResult) {
    throw new Error('Evaluator: quebra_objecoes (critério obrigatório) falhou após retries')
  }

  const criterios_opcionais: Record<string, CriterioGenericoResult> = {}
  const findings: CriterionFinding[] = [{
    key: 'quebra_objecoes',
    label: 'Quebra de Objeções',
    nota: quebraResult.nota,
    justificativa: quebraResult.justificativa,
    evidencias: quebraResult.evidencias,
    sugestoes: quebraResult.sugestoes,
  }]

  for (const entry of optionalResults) {
    if (!entry) continue
    const { key, label, result } = entry
    if (!result) {
      console.warn(`[evaluator] critério opcional "${key}" falhou após retries — omitido de criterios_opcionais`)
      continue
    }
    criterios_opcionais[key] = result
    findings.push({ key, label, nota: result.nota, justificativa: result.justificativa, evidencias: result.evidencias, sugestoes: result.sugestoes })
  }

  const insights = await runWithRetry(() => runInsightsSynthesis(findings), 'insights')
    ?? { positivos: [], melhorias: [] }

  return {
    quebra_objecoes: quebraResult,
    criterios_opcionais,
    insights,
  }
}
