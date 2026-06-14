import { z } from 'zod'
import { openai } from '@/lib/openai'
import { safeParseJson } from './pipeline'
import { buildConfigPrompt, type AiConfig } from '@/lib/ai-config'
import type { LigacaoResultV2 } from '@/lib/types/agents'

const SYSTEM_PROMPT = `Você é um especialista em análise de ligações comerciais B2B de prospecção.

## OBJETIVO DA LIGAÇÃO
NÃO é fazer diagnóstico completo do cliente.
É gerar interesse suficiente para agendar reunião de 15-20min.

## SUA TAREFA
1. Leia toda a transcrição da ligação
2. Extraia evidências concretas (trechos exatos da conversa)
3. Atribua notas de 0 a 10 baseadas em critérios objetivos
4. Retorne APENAS o JSON - sem texto antes, depois ou ao redor

## CRITÉRIOS DE AVALIAÇÃO

### BLOCO 1: PERFORMANCE DO VENDEDOR (6 critérios)

#### 1. ACESSO AO DECISOR (0-10)
- 0-3: Não tentou identificar decisor ou assumiu errado
- 4-6: Identificou que não era decisor mas não agiu
- 7-8: Lidou bem com intermediários, pediu contato/horário
- 9-10: Falou com decisor confirmado ou agendou retorno assertivo

#### 2. EXPLICAÇÃO DO MOTIVO (0-10)
- 0-3: Não explicou ou foi confuso
- 4-6: Explicação vaga
- 7-8: Explicação clara sobre o motivo da ligação
- 9-10: Explicação objetiva + contexto relevante

#### 3. GERAÇÃO DE CURIOSIDADE (0-10)
Gatilhos possíveis: possibilidade de economia, melhoria, revisão de contrato, alternativas de mercado, oportunidade do momento.
- 0-3: Apresentação genérica, sem curiosidade
- 4-6: Benefícios vagos
- 7-8: Usou gatilhos de interesse
- 9-10: Curiosidade personalizada ao contexto do cliente

#### 4. CONDUÇÃO DA CONVERSA (0-10)
- 0-3: Monólogo, não escutou, perdeu controle
- 4-6: Conduziu com desvios
- 7-8: Boa fluidez, equilibrou fala e escuta
- 9-10: Escuta ativa, redirecionou para agendamento

#### 5. PEDIDO DE REUNIÃO (0-10) — PESO 2X, MAIS IMPORTANTE
- 0-3: Não pediu ou muito vago
- 4-6: Pediu mas sem horários específicos
- 7-8: Convite claro + duração + horários sugeridos
- 9-10: Convite assertivo + superou objeções + confirmou

#### 6. COMUNICAÇÃO (0-10)
- 0-3: Confuso, robótico, inseguro
- 4-6: Aceitável mas pouco natural
- 7-8: Boa comunicação, confiante
- 9-10: Excelente, natural, empático

### BLOCO 2: QUALIFICAÇÃO DO LEAD (2 critérios)

#### 7. AUTORIDADE DE DECISÃO (0-10)
- 0-3: Não decisor, sem acesso
- 4-6: Influenciador
- 7-8: Co-decisor
- 9-10: Decisor final confirmado

#### 8. INTERESSE APARENTE (0-10)
- 0-3: Desinteresse claro
- 4-6: Educado mas sem interesse real
- 7-8: Interesse moderado
- 9-10: Alto interesse, fez perguntas

## CÁLCULOS OBRIGATÓRIOS
nota_geral_vendedor = [(N1 + N2 + N3 + N4 + N6) + (N5 × 2)] ÷ 7
nota_geral_lead = (N7 + N8) ÷ 2
probabilidade = (nota_geral_vendedor × 0.6 + nota_geral_lead × 0.4) × 10 (inteiro 0-100)

Classificação da ligação: excelente (>=8), boa (>=6), regular (>=4), fraca (<4)
Classificação do lead: HOT (>=7), WARM (>=4), COLD (<4)

## FORMATO DE SAÍDA
Retorne APENAS JSON válido sem texto adicional.`

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

const ObjecaoRecebidaSchema = z.object({
  objecao: z.string(),
  resposta_vendedor: z.string(),
  foi_bem_tratada: z.boolean(),
})

const LigacaoV2Schema = z.object({
  performance_vendedor: z.object({
    acesso_decisor: CriterioSchema.extend({
      falou_com_decisor: z.boolean().default(false),
      sinais_positivos: z.array(z.string()).default([]),
      sinais_negativos: z.array(z.string()).default([]),
    }),
    explicacao_motivo: CriterioSchema.extend({
      foi_claro: z.boolean().default(false),
      mencionou_revisao_plano: z.boolean().default(false),
    }),
    geracao_curiosidade: CriterioSchema.extend({
      gatilhos_utilizados: z.array(z.string()).default([]),
      fez_diagnostico_na_ligacao: z.boolean().default(false),
      oportunidades_perdidas: z.array(z.string()).default([]),
    }),
    conducao_conversa: CriterioSchema.extend({
      equilibrio_fala_escuta: z.string().default('regular'),
      fez_perguntas: z.boolean().default(false),
      manteve_foco_agendamento: z.boolean().default(false),
      desvios_foco: z.array(z.string()).default([]),
    }),
    pedido_reuniao: CriterioSchema.extend({
      fez_convite_claro: z.boolean().default(false),
      explicou_duracao_reuniao: z.boolean().default(false),
      sugeriu_horarios_especificos: z.boolean().default(false),
      objecoes_recebidas: z.array(ObjecaoRecebidaSchema).default([]),
      resultado: z.enum(['agendado', 'pendente', 'recusado', 'nao_pediu']).default('nao_pediu'),
    }),
    comunicacao: CriterioSchema.extend({
      tom_voz: z.string().default('nao_avaliavel'),
      naturalidade: z.string().default('media'),
      clareza: z.string().default('media'),
      empatia_percebida: z.string().default('media'),
    }),
  }),
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
  contextoEmpresa?: string,
  customConfig?: AiConfig | null,
): Promise<LigacaoResultV2> {
  const configAppendix = customConfig ? buildConfigPrompt(customConfig, 'ligacao') : ''
  const systemPrompt = configAppendix ? `${SYSTEM_PROMPT}\n\n${configAppendix}` : SYSTEM_PROMPT

  const userContent = contextoEmpresa
    ? `Contexto da empresa:\n${contextoEmpresa}\n\nTranscrição da ligação:\n${transcricao}`
    : `Transcrição da ligação:\n${transcricao}`

  const response = await openai.chat.completions.create({
    model: 'o4-mini',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
  })

  const text = response.choices[0]?.message?.content ?? ''
  const raw = safeParseJson(text)
  const parsed = LigacaoV2Schema.safeParse(raw)

  if (!parsed.success) {
    throw new Error(`Ligação v2 schema inválido: ${parsed.error.issues.map(i => i.message).join('; ')}`)
  }

  return parsed.data
}
