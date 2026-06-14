import { z } from 'zod'
import { openai } from '@/lib/openai'
import { safeParseJson } from './pipeline'
import { buildConfigPrompt, type AiConfig } from '@/lib/ai-config'
import type { EvaluatorResult } from '@/lib/types/agents'

const SYSTEM_PROMPT = `Você é um especialista em análise de vendas e coaching comercial. Avalie a transcrição nos 3 critérios abaixo e retorne EXATAMENTE o JSON especificado — sem texto adicional, sem markdown.

CRITÉRIOS:
- nota1 (Escuta Ativa): o vendedor fez perguntas abertas, demonstrou empatia, adaptou o discurso com base nas respostas?
- nota2 (Quebra de Objeções): o vendedor identificou e respondeu objeções com argumentos sólidos? Liste TODAS as objeções — explícitas e implícitas — sem limitar a quantidade.
- nota3 (Apresentação do Produto/Serviço): o vendedor conectou benefícios às dores do cliente, usou provas sociais, criou urgência ética?

ESTRUTURA OBRIGATÓRIA DO JSON:
{
  "nota1": {
    "valor": 7.5,
    "justificativa": "texto explicando a nota de escuta ativa",
    "evidencias": ["trecho 1 da transcrição que evidencia escuta", "trecho 2"],
    "sugestoes": ["o que o vendedor poderia ter feito diferente 1", "sugestão 2"]
  },
  "nota2": {
    "valor": 6.0,
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
      },
      {
        "numero": 2,
        "texto": "segunda objeção se houver",
        "status": "nao_quebrada",
        "como_tratou": "resposta dada",
        "sugestao_quebra": "resposta ideal"
      }
    ]
  },
  "nota3": {
    "valor": 8.0,
    "justificativa": "texto explicando a nota de apresentação",
    "evidencias": ["trecho mostrando apresentação da solução"],
    "sugestoes": ["como poderia ter apresentado melhor"]
  },
  "nota_geral": 7.2,
  "insights": {
    "positivos": [
      "ponto forte específico identificado na call 1",
      "ponto forte 2",
      "ponto forte 3"
    ],
    "melhorias": [
      "oportunidade de melhoria concreta 1",
      "oportunidade 2",
      "oportunidade 3"
    ]
  }
}

REGRAS:
- status das objeções: exatamente "quebrada", "parcial" ou "nao_quebrada"
- Liste TODAS as objeções do cliente, incluindo hesitações, dúvidas e resistências implícitas
- valores numéricos entre 0 e 10 (números, não strings)
- insights.positivos e insights.melhorias devem ter entre 2 e 5 itens cada
- Se não houver objeções, use "objecoes": []`

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

const NotaSchema = z.object({
  valor:         z.coerce.number().min(0).max(10),
  justificativa: z.string().optional().default(''),
  evidencias:    z.array(z.string()).optional().default([]),
  sugestoes:     z.array(z.string()).optional().default([]),
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
  nota1: NotaSchema,
  nota2: NotaSchema.extend({
    objecoes: z.array(ObjecaoSchema).optional().default([]),
  }),
  nota3: NotaSchema,
  nota_geral: z.coerce.number().min(0).max(10).optional(),
  insights:   InsightsSchema.optional().default({ positivos: [], melhorias: [] }),
}).transform(d => ({
  ...d,
  nota_geral: d.nota_geral ??
    Math.round(((d.nota1.valor * 0.30) + (d.nota2.valor * 0.35) + (d.nota3.valor * 0.35)) * 10) / 10,
}))

export async function runEvaluator(transcription: string, customConfig?: AiConfig | null): Promise<EvaluatorResult> {
  const configAppendix = customConfig ? buildConfigPrompt(customConfig, 'reuniao') : ''
  const systemPrompt = configAppendix
    ? `${SYSTEM_PROMPT}\n\n${configAppendix}`
    : SYSTEM_PROMPT

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
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

  return parsed.data as EvaluatorResult
}
