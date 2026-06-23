import { z } from 'zod'
import { CriterioGenericoSchema, callCriterionAgent } from './shared'
import type { QuebraObjecoesResult } from '@/lib/types/agents'

const SYSTEM_PROMPT = `Você é um especialista em tratamento de objeções comerciais. Sua ÚNICA tarefa é analisar como o vendedor lidou com resistências, dúvidas e objeções do cliente durante esta reunião — ignore completamente qualquer outro aspecto da call (escuta ativa, SPIN, apresentação, rapport, urgência). Não avalie nada além disso.

O QUE CONTA COMO OBJEÇÃO:
- Objeções explícitas: "está caro", "não preciso disso agora", "preciso falar com meu sócio", "já uso outro fornecedor"
- Objeções implícitas: hesitação, silêncio após uma proposta, "vou pensar", comparação não solicitada com concorrente, mudança de assunto após um argumento do vendedor
Liste TODAS, sem exceção e sem limite de quantidade — a integridade da lista importa mais do que a nota.

RUBRICA (nota 0-10):
- 0-3: Vendedor ignorou ou minimizou a objeção, ficou na defensiva, ou não respondeu de forma alguma
- 4-6: Reconheceu a objeção mas respondeu de forma genérica/fraca, sem argumento específico
- 7-8: Respondeu com argumento relevante e específico, mas não confirmou se a objeção foi de fato resolvida
- 9-10: Reenquadrou a objeção como oportunidade, usou prova social/dado concreto, e confirmou explicitamente com o cliente que a dúvida foi resolvida

EVIDÊNCIAS: para cada objeção, capture o trecho exato (ou bem próximo) onde o cliente a levanta E o trecho onde o vendedor responde.

SUGESTÕES: para objeções com status "parcial" ou "nao_quebrada", proponha uma resposta alternativa concreta e específica ao contexto da objeção — nunca um conselho genérico como "seja mais confiante".

Retorne EXATAMENTE este JSON, sem texto adicional, sem markdown:
{
  "nota": 6.0,
  "justificativa": "texto explicando a nota geral de tratamento de objeções",
  "evidencias": ["trecho 1 mostrando objeção ou resposta", "trecho 2"],
  "sugestoes": ["melhoria concreta na abordagem de uma objeção específica"],
  "objecoes": [
    {
      "numero": 1,
      "texto": "texto exato ou resumo da objeção levantada pelo cliente",
      "status": "quebrada",
      "como_tratou": "como o vendedor respondeu a esta objeção",
      "sugestao_quebra": "como deveria ter respondido para maximizar resultado"
    }
  ]
}

REGRAS:
- status: exatamente "quebrada", "parcial" ou "nao_quebrada"
- valores numéricos entre 0 e 10 (números, não strings)
- Se não houver nenhuma objeção na call, use "objecoes": []`

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

const QuebraObjecoesSchema = CriterioGenericoSchema.extend({
  objecoes: z.array(ObjecaoSchema).optional().default([]),
})

export async function runQuebraObjecoes(
  transcricao: string,
  conhecimentos?: string | null,
): Promise<QuebraObjecoesResult> {
  const raw = await callCriterionAgent('quebra_objecoes', SYSTEM_PROMPT, transcricao, conhecimentos)
  const parsed = QuebraObjecoesSchema.safeParse(raw)

  if (!parsed.success) {
    console.error('[quebra_objecoes] schema mismatch. Raw:', JSON.stringify(raw).slice(0, 800))
    console.error('[quebra_objecoes] errors:', parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`))
    throw new Error(`quebra_objecoes schema: ${parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')}`)
  }

  return parsed.data
}
