import { z } from 'zod'
import { openai } from '@/lib/openai'
import { safeParseJson } from '../pipeline'
import type { CriterioGenericoResult } from '@/lib/types/agents'

export const CriterioGenericoSchema = z.object({
  nota:          z.coerce.number().min(0).max(10),
  justificativa: z.string().optional().default(''),
  evidencias:    z.array(z.string()).optional().default([]),
  sugestoes:     z.array(z.string()).optional().default([]),
})

/** Monta o user message com conhecimentos do negócio (se houver) + transcrição. */
export function buildUserContent(transcricao: string, conhecimentos?: string | null): string {
  const ctx = conhecimentos?.trim()
    ? `CONTEXTO DO NEGÓCIO (use para calibrar a avaliação ao cenário real desta empresa):\n${conhecimentos.trim()}\n\n`
    : ''
  return `${ctx}Analise a transcrição abaixo e retorne o JSON de avaliação:\n\n${transcricao}`
}

/** Chamada OpenAI + parse JSON cru. Lança erro em caso de falha de parse. */
export async function callCriterionAgent(
  label: string,
  systemPrompt: string,
  transcricao: string,
  conhecimentos?: string | null,
): Promise<unknown> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: buildUserContent(transcricao, conhecimentos) },
    ],
  })

  const text = response.choices[0]?.message?.content ?? ''
  try {
    return safeParseJson(text)
  } catch {
    console.error(`[${label}] JSON parse failed. Raw text:`, text.slice(0, 800))
    throw new Error(`${label} retornou JSON inválido`)
  }
}

/** Helper de alto nível para critérios de formato genérico (nota+justificativa+evidencias+sugestoes). */
export async function runSingleCriterionAgent(
  label: string,
  systemPrompt: string,
  transcricao: string,
  conhecimentos?: string | null,
): Promise<CriterioGenericoResult> {
  const raw = await callCriterionAgent(label, systemPrompt, transcricao, conhecimentos)
  const parsed = CriterioGenericoSchema.safeParse(raw)

  if (!parsed.success) {
    console.error(`[${label}] schema mismatch. Raw:`, JSON.stringify(raw).slice(0, 800))
    console.error(`[${label}] errors:`, parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`))
    throw new Error(`${label} schema: ${parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')}`)
  }

  return parsed.data
}
