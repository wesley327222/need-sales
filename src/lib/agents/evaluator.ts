import { z } from 'zod'
import { openai } from '@/lib/openai'
import { safeParseJson } from './pipeline'
import { buildConfigPrompt, type AiConfig } from '@/lib/ai-config'
import type { CriterionDef } from '@/lib/criteria-definitions'
import type { EvaluatorResult } from '@/lib/types/agents'

const BASE_PROMPT = `Você é um especialista em análise de vendas e coaching comercial. Avalie a transcrição nos critérios abaixo e retorne EXATAMENTE o JSON especificado — sem texto adicional, sem markdown.

CRITÉRIO OBRIGATÓRIO:
- quebra_objecoes: o vendedor identificou e respondeu objeções com argumentos sólidos? Liste TODAS as objeções — explícitas e implícitas — sem limitar a quantidade.`

const ObjecaoSchema = z.object({
  numero:          z.coerce.number().optional().default(1),
  texto:           z.string(),
  status:          z.string().transform(s => {
    const n = s.toLowerCase()
    if (n.includes('nao') || n.includes('não') || n === 'nao_quebrada') return 'nao_quebrada' as const
    if (n.includes('parcial')) return 'parcial' as const
    return 'quebrada' as const
  }),
  como_tratou:     z.string().optional().default(''),
  sugestao_quebra: z.string().optional().default(''),
})

const GenericCriterioSchema = z.object({
  nota:          z.coerce.number().min(0).max(10),
  justificativa: z.string().optional().default(''),
  evidencias:    z.array(z.string()).optional().default([]),
  sugestoes:     z.array(z.string()).optional().default([]),
})

const QuebraObjecoesSchema = GenericCriterioSchema.extend({
  objecoes: z.array(ObjecaoSchema).optional().default([]),
})

// Accept insights as either structured object OR legacy flat array
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

const EvaluatorSchema = z.object({
  quebra_objecoes: QuebraObjecoesSchema,
  criterios_opcionais: z.record(z.string(), GenericCriterioSchema).optional().default({}),
  insights: InsightsSchema.optional().default({ positivos: [], melhorias: [] }),
})

function buildSystemPrompt(activeOptional: CriterionDef[]): string {
  const lines = [BASE_PROMPT]

  if (activeOptional.length > 0) {
    lines.push('')
    lines.push('CRITÉRIOS OPCIONAIS SELECIONADOS PELA EMPRESA (avalie cada um, retorne em criterios_opcionais):')
    for (const c of activeOptional) {
      lines.push(`- ${c.key} (${c.label}): ${c.descricao}`)
    }
  }

  const criteriosOpcionaisExample = activeOptional.length > 0
    ? activeOptional.map(c => `    "${c.key}": {
      "nota": 7.0,
      "justificativa": "texto explicando a nota de ${c.label.toLowerCase()}",
      "evidencias": ["trecho da transcrição que evidencia o critério"],
      "sugestoes": ["sugestão de melhoria"]
    }`).join(',\n')
    : ''

  lines.push('')
  lines.push(`ESTRUTURA OBRIGATÓRIA DO JSON:
{
  "quebra_objecoes": {
    "nota": 6.0,
    "justificativa": "texto explicando a nota de quebra de objeções",
    "evidencias": ["trecho 1 mostrando objeção ou resposta", "trecho 2"],
    "sugestoes": ["melhoria na abordagem de objeções 1"],
    "objecoes": [
      {
        "numero": 1,
        "texto": "texto exato ou resumo da objeção levantada pelo cliente",
        "status": "quebrada",
        "como_tratou": "como o vendedor respondeu a esta objeção",
        "sugestao_quebra": "como deveria ter respondido para maximizar resultado"
      }
    ]
  },
  "criterios_opcionais": {
${criteriosOpcionaisExample}
  },
  "insights": {
    "positivos": ["ponto forte específico identificado na call 1", "ponto forte 2", "ponto forte 3"],
    "melhorias": ["oportunidade de melhoria concreta 1", "oportunidade 2", "oportunidade 3"]
  }
}

REGRAS:
- status das objeções: exatamente "quebrada", "parcial" ou "nao_quebrada"
- Liste TODAS as objeções do cliente, incluindo hesitações, dúvidas e resistências implícitas
- valores numéricos entre 0 e 10 (números, não strings)
- insights.positivos e insights.melhorias devem ter entre 2 e 5 itens cada
- Se não houver objeções, use "objecoes": []
- criterios_opcionais deve conter EXATAMENTE as chaves listadas acima, nem mais nem menos`)

  return lines.join('\n')
}

export async function runEvaluator(
  transcription: string,
  activeOptional: CriterionDef[],
  customConfig?: AiConfig | null
): Promise<EvaluatorResult> {
  const systemPrompt = buildSystemPrompt(activeOptional)
  const configAppendix = customConfig ? buildConfigPrompt(customConfig, 'reuniao') : ''
  const fullPrompt = configAppendix ? `${systemPrompt}\n\n${configAppendix}` : systemPrompt

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: fullPrompt },
      {
        role: 'user',
        content: `Analise a seguinte transcrição e retorne o JSON de avaliação:\n\n${transcription}`,
      },
    ],
  })

  const text = response.choices[0]?.message?.content ?? ''

  let raw: unknown
  try {
    raw = safeParseJson(text)
  } catch {
    console.error('[evaluator] JSON parse failed. Raw text:', text.slice(0, 800))
    throw new Error('Evaluator retornou JSON inválido')
  }

  const parsed = EvaluatorSchema.safeParse(raw)

  if (!parsed.success) {
    console.error('[evaluator] schema mismatch. Raw:', JSON.stringify(raw).slice(0, 800))
    console.error('[evaluator] errors:', parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`))
    throw new Error(`Evaluator schema: ${parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')}`)
  }

  // Defensivo: mantém só as chaves opcionais que foram de fato solicitadas
  const activeKeys = new Set(activeOptional.map(c => c.key))
  const filteredOpcionais = Object.fromEntries(
    Object.entries(parsed.data.criterios_opcionais).filter(([key]) => activeKeys.has(key))
  )

  return {
    ...parsed.data,
    criterios_opcionais: filteredOpcionais,
  }
}
