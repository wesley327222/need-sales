import { z } from 'zod'
import { openai } from '@/lib/openai'
import { safeParseJson } from './pipeline'
import type { SpinResult } from '@/lib/types/agents'

const SYSTEM_PROMPT = `Você é um especialista em metodologia SPIN Selling. Analise a transcrição de vendas e avalie as 4 dimensões do SPIN.

ESTRUTURA OBRIGATÓRIA DO JSON — use exatamente estas chaves:
{
  "nota4": {
    "S": {
      "valor": 7.0,
      "justificativa": "o vendedor fez X perguntas de situação...",
      "evidencias": ["trecho da transcrição mostrando pergunta S"],
      "sugestoes": ["poderia ter perguntado sobre..."]
    },
    "P": {
      "valor": 6.0,
      "justificativa": "o vendedor identificou Y problemas...",
      "evidencias": ["trecho mostrando pergunta P"],
      "sugestoes": ["deveria ter explorado..."]
    },
    "I": {
      "valor": 5.0,
      "justificativa": "exploração das implicações foi...",
      "evidencias": ["trecho mostrando pergunta I"],
      "sugestoes": ["deveria ter perguntado sobre impacto de..."]
    },
    "N": {
      "valor": 8.0,
      "justificativa": "o cliente verbalizou necessidade quando...",
      "evidencias": ["trecho mostrando pergunta N"],
      "sugestoes": ["poderia ter reforçado..."]
    },
    "media": 6.5
  }
}

REGRAS:
- valores numéricos DEVEM ser números (não strings), entre 0 e 10
- "media" é a média aritmética de S, P, I e N
- Retorne APENAS o JSON, sem texto adicional, sem markdown`

const SpinDimensionSchema = z.object({
  valor:        z.coerce.number().min(0).max(10),
  justificativa: z.string().optional().default(''),
  evidencias:   z.array(z.string()).optional().default([]),
  sugestoes:    z.array(z.string()).optional().default([]),
})

const SpinDimensionsShape = {
  S: SpinDimensionSchema,
  P: SpinDimensionSchema,
  I: SpinDimensionSchema,
  N: SpinDimensionSchema,
  media: z.coerce.number().min(0).max(10).optional(),
}

// Accept either { nota4: { S, P, I, N, media } } or flat { S, P, I, N, media }
const SpinSchema = z.union([
  z.object({ nota4: z.object(SpinDimensionsShape) }),
  z.object(SpinDimensionsShape).transform(flat => ({ nota4: flat })),
]).transform(d => {
  const dims = d.nota4
  const media = dims.media ??
    Math.round(((dims.S.valor + dims.P.valor + dims.I.valor + dims.N.valor) / 4) * 10) / 10
  return { nota4: { ...dims, media } }
})

export async function runSpin(transcription: string): Promise<SpinResult> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Analise a seguinte transcrição sob a ótica do SPIN Selling e retorne o JSON:\n\n${transcription}`,
      },
    ],
  })

  const text = response.choices[0]?.message?.content ?? ''

  let raw: unknown
  try {
    raw = safeParseJson(text)
  } catch {
    console.error('[spin] JSON parse failed. Raw text:', text.slice(0, 800))
    throw new Error('SPIN retornou JSON inválido')
  }

  const parsed = SpinSchema.safeParse(raw)

  if (!parsed.success) {
    console.error('[spin] schema mismatch. Raw:', JSON.stringify(raw).slice(0, 800))
    console.error('[spin] errors:', parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`))
    throw new Error(`SPIN schema: ${parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')}`)
  }

  return parsed.data as SpinResult
}
