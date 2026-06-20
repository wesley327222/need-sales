import { z } from 'zod'
import { openai } from '@/lib/openai'
import { safeParseJson } from './pipeline'
import { buildConfigPrompt, type AiConfig } from '@/lib/ai-config'
import type { CriterionDef } from '@/lib/criteria-definitions'
import type { LigacaoResultV2 } from '@/lib/types/agents'

const RUBRICAS: Record<string, string> = {
  acesso_decisor: `- 0-3: Não tentou identificar decisor ou assumiu errado
- 4-6: Identificou que não era decisor mas não agiu
- 7-8: Lidou bem com intermediários, pediu contato/horário
- 9-10: Falou com decisor confirmado ou agendou retorno assertivo`,
  explicacao_motivo: `- 0-3: Não explicou ou foi confuso
- 4-6: Explicação vaga
- 7-8: Explicação clara sobre o motivo da ligação
- 9-10: Explicação objetiva + contexto relevante`,
  geracao_curiosidade: `Gatilhos possíveis: possibilidade de economia, melhoria, revisão de contrato, alternativas de mercado, oportunidade do momento.
- 0-3: Apresentação genérica, sem curiosidade
- 4-6: Benefícios vagos
- 7-8: Usou gatilhos de interesse
- 9-10: Curiosidade personalizada ao contexto do cliente`,
  conducao_conversa: `- 0-3: Monólogo, não escutou, perdeu controle
- 4-6: Conduziu com desvios
- 7-8: Boa fluidez, equilibrou fala e escuta
- 9-10: Escuta ativa, redirecionou para agendamento`,
  comunicacao: `- 0-3: Confuso, robótico, inseguro
- 4-6: Aceitável mas pouco natural
- 7-8: Boa comunicação, confiante
- 9-10: Excelente, natural, empático`,
}

const PEDIDO_REUNIAO_RUBRICA = `- 0-3: Não pediu ou muito vago
- 4-6: Pediu mas sem horários específicos
- 7-8: Convite claro + duração + horários sugeridos
- 9-10: Convite assertivo + superou objeções + confirmou`

const INTRO = `Você é um especialista em análise de ligações comerciais B2B de prospecção.

## OBJETIVO DA LIGAÇÃO
NÃO é fazer diagnóstico completo do cliente.
É gerar interesse suficiente para agendar reunião de 15-20min.

## SUA TAREFA
1. Leia toda a transcrição da ligação
2. Extraia evidências concretas (trechos exatos da conversa)
3. Atribua notas de 0 a 10 baseadas em critérios objetivos
4. Retorne APENAS o JSON - sem texto antes, depois ou ao redor

## CRITÉRIOS DE AVALIAÇÃO DE DESEMPENHO DO VENDEDOR`

const BLOCO_QUALIFICACAO = `## QUALIFICAÇÃO DO LEAD (sempre avaliada, independente dos critérios de desempenho)

#### A. AUTORIDADE DE DECISÃO (0-10)
- 0-3: Não decisor, sem acesso
- 4-6: Influenciador
- 7-8: Co-decisor
- 9-10: Decisor final confirmado

#### B. INTERESSE APARENTE (0-10)
- 0-3: Desinteresse claro
- 4-6: Educado mas sem interesse real
- 7-8: Interesse moderado
- 9-10: Alto interesse, fez perguntas

## CÁLCULOS
nota_geral_lead = (autoridade_decisao + interesse_aparente) ÷ 2
nota_geral_vendedor: dê uma estimativa aproximada da performance geral do vendedor nos critérios avaliados (0-10) — esse valor será recalculado automaticamente pelo sistema com base nos pesos configurados pela empresa, então uma estimativa aproximada é suficiente
probabilidade_agendamento = (nota_geral_vendedor × 0.6 + nota_geral_lead × 0.4) × 10 (inteiro 0-100)

Classificação da ligação: excelente (>=8), boa (>=6), regular (>=4), fraca (<4)
Classificação do lead: HOT (>=7), WARM (>=4), COLD (<4)

## FORMATO DE SAÍDA
Retorne APENAS JSON válido sem texto adicional.`

function buildSystemPrompt(activeOptional: CriterionDef[]): string {
  let n = 1
  const mandatoryBlock = `#### ${n++}. PEDIDO DE REUNIÃO (0-10) — CRITÉRIO OBRIGATÓRIO, PESO 2X, MAIS IMPORTANTE\n${PEDIDO_REUNIAO_RUBRICA}`

  const optionalBlocks = activeOptional
    .map(c => `#### ${n++}. ${c.label.toUpperCase()} (0-10)\n${RUBRICAS[c.key] ?? c.descricao}`)
    .join('\n\n')

  return [
    INTRO,
    mandatoryBlock,
    optionalBlocks,
    BLOCO_QUALIFICACAO,
  ].filter(Boolean).join('\n\n')
}

// ── Zod schemas ───────────────────────────────────────────────────────────────

const EvidenciaSchema = z.object({
  trecho: z.string(),
  timestamp_inicio: z.string().default('N/A'),
  timestamp_fim: z.string().default('N/A'),
})

const CriterioSchema = z.object({
  nota: z.number().min(0).max(10),
  justificativa: z.string(),
  evidencias: z.array(EvidenciaSchema).default([]),
})

const GenericCriterioSchema = z.object({
  nota: z.number().min(0).max(10),
  justificativa: z.string().optional().default(''),
  evidencias: z.array(z.string()).optional().default([]),
  sugestoes: z.array(z.string()).optional().default([]),
})

const ObjecaoRecebidaSchema = z.object({
  objecao: z.string(),
  resposta_vendedor: z.string(),
  foi_bem_tratada: z.boolean(),
})

const PedidoReuniaoSchema = CriterioSchema.extend({
  fez_convite_claro: z.boolean().default(false),
  explicou_duracao_reuniao: z.boolean().default(false),
  sugeriu_horarios_especificos: z.boolean().default(false),
  objecoes_recebidas: z.array(ObjecaoRecebidaSchema).default([]),
  resultado: z.enum(['agendado', 'pendente', 'recusado', 'nao_pediu']).default('nao_pediu'),
})

const LigacaoV2Schema = z.object({
  pedido_reuniao: PedidoReuniaoSchema,
  criterios_opcionais: z.record(z.string(), GenericCriterioSchema).optional().default({}),
  qualificacao_lead: z.object({
    autoridade_decisao: CriterioSchema.extend({
      nivel_autoridade: z.string().default('nao_identificado'),
      outros_envolvidos_processo: z.array(z.string()).default([]),
    }),
    interesse_aparente: CriterioSchema.extend({
      nivel_interesse: z.string().default('baixo'),
      sinais_compra: z.array(z.string()).default([]),
      sinais_resistencia: z.array(z.string()).default([]),
    }),
    contexto_atual: z.object({
      tem_plano_saude_atual: z.boolean().default(false),
      operadora_atual: z.string().default('Não mencionada'),
      insatisfacoes_mencionadas: z.array(z.string()).default([]),
      numero_vidas: z.string().default('Não mencionado'),
      momento_mercado: z.string().default('Não mencionado'),
    }).optional(),
  }),
  metricas_gerais: z.object({
    nota_geral_vendedor: z.number(),
    nota_geral_lead: z.number(),
    classificacao_ligacao: z.enum(['excelente', 'boa', 'regular', 'fraca']),
    classificacao_lead: z.enum(['HOT', 'WARM', 'COLD']),
    probabilidade_agendamento: z.number().int().min(0).max(100),
  }),
  analise_final: z.object({
    resumo_executivo: z.string(),
    tinha_potencial_agendar: z.object({
      resposta: z.boolean(),
      justificativa: z.string(),
    }).optional(),
    top_3_pontos_fortes: z.array(z.string()).default([]),
    top_3_pontos_melhoria: z.array(z.string()).default([]),
    oportunidades_perdidas_criticas: z.array(z.string()).default([]),
    principais_riscos: z.array(z.string()).default([]),
    recomendacao_estrategica: z.string(),
    proximos_passos_sugeridos: z.array(z.string()).min(1),
  }),
})

export async function runLigacaoEvaluator(
  transcricao: string,
  activeOptional: CriterionDef[],
  contextoEmpresa?: string,
  customConfig?: AiConfig | null,
): Promise<LigacaoResultV2> {
  const systemPrompt = buildSystemPrompt(activeOptional)
  const configAppendix = customConfig ? buildConfigPrompt(customConfig, 'ligacao') : ''
  const fullPrompt = configAppendix ? `${systemPrompt}\n\n${configAppendix}` : systemPrompt

  const userContent = contextoEmpresa
    ? `Contexto da empresa:\n${contextoEmpresa}\n\nTranscrição da ligação:\n${transcricao}`
    : `Transcrição da ligação:\n${transcricao}`

  const response = await openai.chat.completions.create({
    model: 'o4-mini',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: fullPrompt },
      { role: 'user', content: userContent },
    ],
  })

  const text = response.choices[0]?.message?.content ?? ''
  const raw = safeParseJson(text)
  const parsed = LigacaoV2Schema.safeParse(raw)

  if (!parsed.success) {
    throw new Error(`Ligação v2 schema inválido: ${parsed.error.issues.map(i => i.message).join('; ')}`)
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
