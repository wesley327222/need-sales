import { z } from 'zod'
import { openai } from '@/lib/openai'
import { safeParseJson } from './pipeline'
import type { FollowupsResult } from '@/lib/types/agents'

const SYSTEM_PROMPT = `Você é um especialista em vendas consultivas e comunicação comercial. Sua função é analisar transcrições de reuniões/ligações de vendas e gerar 3 follow-ups estratégicos altamente personalizados.

Você DEVE gerar exatamente estes 3 follow-ups, nesta estrutura:

1. **whatsapp_d1** — Mensagem WhatsApp para enviar no dia seguinte (D+1). Curta, informal, referenciando algo específico da conversa.
2. **whatsapp_d3** — Mensagem WhatsApp para enviar 3 dias depois (D+3). Traz um insight ou valor adicional, mantém o interesse.
3. **email_d5** — Email para enviar 5 dias depois (D+5). Mais formal, com assunto e corpo completo. Pode incluir proposta ou próximos passos.

Além dos follow-ups, forneça:
- **proposta_sugerida**: Qual é a melhor proposta comercial a fazer com base no que foi discutido
- **interesses_do_lead**: Principais interesses identificados na conversa (lista)
- **dores_principais**: Principais dores/problemas do lead (lista)
- **probabilidade_fechamento**: Estimativa de probabilidade de fechamento (alta/media/baixa)

As mensagens devem ser naturais, personalizadas e baseadas na conversa — nunca genéricas.

Responda APENAS com JSON válido, sem texto adicional, sem markdown.`

const FollowupsSchema = z.object({
  whatsapp_d1: z.string().min(1),
  whatsapp_d3: z.string().min(1),
  email_d5: z.object({
    assunto: z.string().min(1),
    corpo:   z.string().min(1),
  }),
  proposta_sugerida:       z.string().optional().default(''),
  interesses_do_lead:      z.array(z.string()).optional().default([]),
  dores_principais:        z.array(z.string()).optional().default([]),
  probabilidade_fechamento: z.string().optional().transform(s => {
    if (!s) return 'media' as const
    const n = s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    if (n.includes('alt')) return 'alta' as const
    if (n.includes('baix')) return 'baixa' as const
    return 'media' as const
  }),
})

export async function runFollowups(transcricao: string): Promise<FollowupsResult> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Analise a transcrição abaixo e gere os 3 follow-ups e análise do lead em JSON:\n\n${transcricao}`,
      },
    ],
  })

  const text = response.choices[0]?.message?.content ?? ''
  const raw = safeParseJson(text)
  const parsed = FollowupsSchema.safeParse(raw)

  if (!parsed.success) {
    console.error('[followups] raw response:', text.slice(0, 500))
    console.error('[followups] validation errors:', parsed.error.issues)
    throw new Error(`Followups schema inválido: ${parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')}`)
  }

  return parsed.data as FollowupsResult
}
