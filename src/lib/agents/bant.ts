import { z } from 'zod'
import { openai } from '@/lib/openai'
import { safeParseJson } from './pipeline'
// BantResult defined locally (no longer in agents.ts)
interface BantCriterio { valor: number; justificativa: string; evidencias: string[] }
interface BantResult {
  performance_vendedor: { abordagem_inicial: BantCriterio; identificacao_necessidades: BantCriterio; apresentacao_solucao: BantCriterio; manejo_objecoes: BantCriterio; fechamento: BantCriterio; rapport: BantCriterio; media: number }
  qualificacao_lead: { budget: BantCriterio; authority: BantCriterio; need: BantCriterio; timeline: BantCriterio; media: number }
  metricas_gerais: { tempo_fala_vendedor_pct: number; tempo_fala_cliente_pct: number; numero_perguntas_abertas: number; numero_perguntas_fechadas: number; nivel_engajamento: 'alto' | 'medio' | 'baixo' }
  analise_final: { pontos_fortes: string[]; areas_melhoria: string[]; recomendacao_proximos_passos: string; score_geral: number }
}

const SYSTEM_PROMPT = `Você é um especialista em análise de ligações comerciais e qualificação de leads pelo framework BANT. Sua função é analisar ligações de vendas em profundidade.

Avalie duas dimensões principais:

**1. Performance do Vendedor** — 6 critérios (0-10 cada):
- abordagem_inicial: Abertura, apresentação, geração de rapport inicial
- identificacao_necessidades: Qualidade das perguntas para entender o cliente
- apresentacao_solucao: Como conectou a solução às necessidades identificadas
- manejo_objecoes: Respostas às dúvidas e resistências
- fechamento: Tentativas de avançar na venda, criar urgência, propor próximos passos
- rapport: Nível de conexão e confiança estabelecida ao longo da conversa
- media: Média dos 6 critérios acima

**2. Qualificação do Lead (BANT)** — 4 critérios (0-10 cada):
- budget: Sinais de capacidade/disponibilidade financeira para a solução
- authority: Sinais de que a pessoa tem poder de decisão ou influência
- need: Urgência e clareza da necessidade identificada
- timeline: Clareza sobre o prazo para tomar uma decisão
- media: Média dos 4 critérios BANT

**3. Métricas gerais** (estime com base na transcrição):
- tempo_fala_vendedor_pct: Porcentagem estimada do tempo que o vendedor falou (0-100)
- tempo_fala_cliente_pct: Porcentagem estimada do tempo que o cliente falou (0-100)
- numero_perguntas_abertas: Quantidade de perguntas abertas feitas pelo vendedor
- numero_perguntas_fechadas: Quantidade de perguntas fechadas feitas pelo vendedor
- nivel_engajamento: Nível de engajamento percebido do cliente (alto/medio/baixo)

**4. Análise final**:
- pontos_fortes: Lista dos principais acertos do vendedor
- areas_melhoria: Lista das principais áreas de melhoria
- recomendacao_proximos_passos: Recomendação clara do que fazer a seguir
- score_geral: Média ponderada (60% performance vendedor + 40% BANT)

Para cada critério de performance e BANT, forneça: valor, justificativa e evidências da transcrição.

Responda APENAS com JSON válido, sem texto adicional, sem markdown.`

const BantCriterioSchema = z.object({
  valor: z.number().min(0).max(10),
  justificativa: z.string(),
  evidencias: z.array(z.string()),
})

const BantSchema = z.object({
  performance_vendedor: z.object({
    abordagem_inicial: BantCriterioSchema,
    identificacao_necessidades: BantCriterioSchema,
    apresentacao_solucao: BantCriterioSchema,
    manejo_objecoes: BantCriterioSchema,
    fechamento: BantCriterioSchema,
    rapport: BantCriterioSchema,
    media: z.number().min(0).max(10),
  }),
  qualificacao_lead: z.object({
    budget: BantCriterioSchema,
    authority: BantCriterioSchema,
    need: BantCriterioSchema,
    timeline: BantCriterioSchema,
    media: z.number().min(0).max(10),
  }),
  metricas_gerais: z.object({
    tempo_fala_vendedor_pct: z.number().min(0).max(100),
    tempo_fala_cliente_pct: z.number().min(0).max(100),
    numero_perguntas_abertas: z.number().int().min(0),
    numero_perguntas_fechadas: z.number().int().min(0),
    nivel_engajamento: z.enum(['alto', 'medio', 'baixo']),
  }),
  analise_final: z.object({
    pontos_fortes: z.array(z.string()),
    areas_melhoria: z.array(z.string()),
    recomendacao_proximos_passos: z.string(),
    score_geral: z.number().min(0).max(10),
  }),
})

export async function runBant(transcription: string): Promise<BantResult> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    temperature: 0,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `Analise a seguinte transcrição de ligação comercial e retorne o JSON BANT:\n\n${transcription}`,
      },
    ],
  })

  const text = response.choices[0]?.message?.content ?? ''
  const raw = safeParseJson(text)
  const parsed = BantSchema.safeParse(raw)

  if (!parsed.success) {
    throw new Error(`BANT schema inválido: ${parsed.error.issues.map(i => i.message).join(', ')}`)
  }

  return parsed.data
}
