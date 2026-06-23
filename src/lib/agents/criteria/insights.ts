import { z } from 'zod'
import { openai } from '@/lib/openai'
import { safeParseJson } from '../pipeline'

export interface CriterionFinding {
  key: string
  label: string
  nota: number
  justificativa: string
  evidencias: string[]
  sugestoes: string[]
}

const SYSTEM_PROMPT = `Você é um especialista em síntese de avaliações de vendas. Você NÃO tem acesso à transcrição original da reunião — recebe apenas os achados já extraídos por especialistas dedicados, um por critério avaliado (nota, justificativa, evidências e sugestões de cada um). Sua tarefa é sintetizar esses achados em um resumo executivo de pontos fortes e oportunidades de melhoria.

REGRAS IMPORTANTES:
- Baseie-se EXCLUSIVAMENTE nos achados fornecidos — nunca invente informação que não esteja nas justificativas/evidências recebidas
- Priorize padrões que aparecem em MAIS DE UM critério (ex: se "escuta_ativa" e "rapport" ambos mostram falta de atenção ao cliente, isso é um ponto de melhoria mais importante do que repetir cada nota isoladamente) — não apenas reescreva cada critério em uma frase separada
- "positivos": 2 a 5 pontos fortes concretos, citando o que especificamente foi bem feito
- "melhorias": 2 a 5 oportunidades de melhoria concretas e acionáveis, priorizando os critérios com nota mais baixa

Retorne EXATAMENTE este JSON, sem texto adicional, sem markdown:
{
  "positivos": ["ponto forte específico 1", "ponto forte 2"],
  "melhorias": ["oportunidade de melhoria concreta 1", "oportunidade 2"]
}`

const InsightsSchema = z.union([
  z.object({
    positivos: z.array(z.string()).optional().default([]),
    melhorias:  z.array(z.string()).optional().default([]),
  }),
  z.array(z.string()).transform(arr => ({
    positivos: arr.slice(0, Math.ceil(arr.length / 2)),
    melhorias:  arr.slice(Math.ceil(arr.length / 2)),
  })),
])

function buildFindingsContent(findings: CriterionFinding[]): string {
  const blocks = findings.map(f => (
    `### ${f.label} (${f.key}) — nota ${f.nota}/10\n` +
    `Justificativa: ${f.justificativa}\n` +
    (f.evidencias.length ? `Evidências:\n${f.evidencias.map(e => `- ${e}`).join('\n')}\n` : '') +
    (f.sugestoes.length ? `Sugestões já levantadas:\n${f.sugestoes.map(s => `- ${s}`).join('\n')}` : '')
  ))
  return `Achados por critério desta reunião:\n\n${blocks.join('\n\n')}\n\nSintetize em positivos e melhorias.`
}

export async function runInsightsSynthesis(
  findings: CriterionFinding[],
): Promise<{ positivos: string[]; melhorias: string[] }> {
  if (!findings.length) return { positivos: [], melhorias: [] }

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildFindingsContent(findings) },
    ],
  })

  const text = response.choices[0]?.message?.content ?? ''

  let raw: unknown
  try {
    raw = safeParseJson(text)
  } catch {
    console.error('[insights] JSON parse failed. Raw text:', text.slice(0, 800))
    throw new Error('insights retornou JSON inválido')
  }

  const parsed = InsightsSchema.safeParse(raw)
  if (!parsed.success) {
    console.error('[insights] schema mismatch. Raw:', JSON.stringify(raw).slice(0, 800))
    throw new Error(`insights schema: ${parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')}`)
  }

  return parsed.data
}
