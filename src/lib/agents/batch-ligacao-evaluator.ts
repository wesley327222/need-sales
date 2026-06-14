import { z } from 'zod'
import { openai } from '@/lib/openai'
import { safeParseJson } from './pipeline'

export interface CallInput {
  numero: number        // 1-based index within the batch
  titulo: string
  transcricao: string
  nota_geral?: number | null
}

const ObjecaoPadraoSchema = z.object({
  objecao: z.string(),
  frequencia: z.number().int().min(1),
  calls_origem: z.array(z.string()),
  trecho_lead: z.string(),
  trecho_resposta_vendedor: z.string(),
  status: z.enum(['QUEBRADA', 'TRATADA_PARCIALMENTE', 'IGNORADA', 'PIORADA']),
  como_tratar: z.string(),
})

const InsightPadraoSchema = z.object({
  titulo: z.string(),
  descricao: z.string(),
  call_origem: z.string(),
  impacto: z.enum(['alto', 'medio', 'baixo']),
})

const FollowupRecomSchema = z.object({
  oportunidade: z.string(),
  acao: z.string(),
  prioridade: z.enum(['ALTA', 'MEDIA', 'BAIXA']),
  gatilho_da_call: z.string(),
  o_que_nao_dizer: z.string(),
})

const CompetidorSchema = z.object({
  nome: z.string(),
  calls_mencionado: z.array(z.string()),
  contexto: z.string(),
})

const AvaliacaoSchema = z.object({
  nota_geral: z.number().min(0).max(10),
  probabilidade_fechamento: z.number().int().min(0).max(100),
  maior_erro: z.string(),
  perfil_vendedor: z.string(),
  pontos_fortes: z.array(z.string()),
  pontos_criticos: z.array(z.string()),
  recomendacoes_coaching: z.array(z.string()),
  proximos_passos: z.array(z.string()),
})

const BatchRelatorioSchema = z.object({
  objecoes: z.array(ObjecaoPadraoSchema).min(1),
  insights: z.array(InsightPadraoSchema).min(1),
  sobre_competicao: z.array(CompetidorSchema).default([]),
  followups: z.array(FollowupRecomSchema).default([]),
  avaliacao: AvaliacaoSchema,
})

export type BatchRelatorio = z.infer<typeof BatchRelatorioSchema>

function buildSystemPrompt(): string {
  return `Você é um diretor de vendas com 20 anos de campo. Analisa calls com precisão cirúrgica e sem piedade. Seu trabalho é diagnosticar PADRÕES — não avaliar calls individualmente.

Você identifica exatamente onde o vendedor sistematicamente erra, quais objeções ele não consegue quebrar, e o que precisa mudar para aumentar a taxa de conversão.

Você NÃO passa pano. Você NÃO elogia esforço. Você avalia execução.

Toda afirmação precisa de evidência direta das calls: trecho exato + número da call de origem.

## REGRAS OBRIGATÓRIAS

### Objeções
- Liste TODAS as objeções distintas do conjunto de calls
- Se a mesma objeção apareceu em múltiplas calls, liste uma vez com frequência
- Objeções implícitas SÃO obrigatórias: "vou pensar", silêncio, evasiva, tom que esfria, pedido de prazo
- PIORADA = a resposta do vendedor aumentou a resistência (mais grave que IGNORADA)
- trecho_lead e trecho_resposta_vendedor devem ser transcrições LITERAIS, não resumos
- Nenhuma lista pode ficar vazia — se as calls aconteceram, há objeções

### Insights
- São PADRÕES observados no conjunto, não fatos isolados de uma call
- Nunca repita o que o lead disse — interprete o que ele quis dizer e o que evitou dizer
- sobre_competicao pode ser [] se não houve menção a concorrentes

### Follow-ups
- São recomendações táticas para oportunidades ainda em aberto
- Cada follow-up deve ser ancorado em um gatilho_da_call específico
- o_que_nao_dizer: identifique o que o vendedor tende a dizer que sabota o follow-up
- Prioridade ALTA = risco real de perda se não executado em 24h

### Avaliação
- nota_geral reflete performance MÉDIA no conjunto, não uma call específica
- probabilidade_fechamento deve ser honesta — se for 12%, coloque 12
- maior_erro é o padrão de MAIOR IMPACTO sobre taxa de conversão, não o mais frequente

Retorne APENAS JSON válido sem texto adicional.`
}

function buildUserPrompt(calls: CallInput[]): string {
  const callsText = calls.map(c => `
=== CALL ${c.numero}: "${c.titulo}" (nota individual: ${c.nota_geral?.toFixed(1) ?? 'N/A'}) ===
${c.transcricao}
`).join('\n')

  return `Analise o conjunto de ${calls.length} ligações do mesmo vendedor e encontre padrões. Retorne o JSON de análise consolidada.

${callsText}

Lembre-se:
- Identifique PADRÕES, não avalie calls individualmente
- Use "Call ${calls[0]?.numero ?? 1}", "Call ${calls[1]?.numero ?? 2}", etc. como identificadores
- trecho_lead e trecho_resposta_vendedor devem ser citações LITERAIS das transcrições
- seja duro e criterioso — sem elogios vazios`
}

export async function runBatchLigacaoEvaluator(calls: CallInput[]): Promise<BatchRelatorio> {
  if (calls.length === 0) throw new Error('Nenhuma call fornecida para análise')

  const response = await openai.chat.completions.create({
    model: 'o4-mini',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user',   content: buildUserPrompt(calls) },
    ],
  })

  const text = response.choices[0]?.message?.content ?? ''
  const raw  = safeParseJson(text)
  const parsed = BatchRelatorioSchema.safeParse(raw)

  if (!parsed.success) {
    const issues = parsed.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; ')
    throw new Error(`Batch schema inválido: ${issues}`)
  }

  return parsed.data
}
