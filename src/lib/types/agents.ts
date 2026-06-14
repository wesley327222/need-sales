// ─── Evaluator Agent (Reuniões) ──────────────────────────────────────────────

export interface ObjecaoAvaliada {
  numero: number
  texto: string
  status: 'quebrada' | 'parcial' | 'nao_quebrada'
  como_tratou: string
  sugestao_quebra: string
}

export interface EvaluatorResult {
  nota1: {
    valor: number // escuta ativa
    justificativa: string
    evidencias: string[]
    sugestoes: string[]
  }
  nota2: {
    valor: number // quebra de objeções
    justificativa: string
    evidencias: string[]
    sugestoes: string[]
    objecoes: ObjecaoAvaliada[]
  }
  nota3: {
    valor: number // apresentação do produto
    justificativa: string
    evidencias: string[]
    sugestoes: string[]
  }
  nota_geral: number
  insights: {
    positivos: string[]
    melhorias: string[]
  }
}

// ─── SPIN Agent ──────────────────────────────────────────────────────────────

export interface SpinDimension {
  valor: number
  justificativa: string
  evidencias: string[]
  sugestoes: string[]
}

export interface SpinResult {
  nota4: {
    S: SpinDimension
    P: SpinDimension
    I: SpinDimension
    N: SpinDimension
    media: number
  }
}

// ─── Ligação Evaluator V2 ────────────────────────────────────────────────────

export interface LigacaoEvidencia {
  trecho: string
  timestamp_inicio: string
  timestamp_fim: string
}

export interface LigacaoCriterioV2 {
  nota: number
  justificativa: string
  evidencias: LigacaoEvidencia[]
  [key: string]: unknown
}

export interface LigacaoResultV2 {
  performance_vendedor: {
    acesso_decisor:      LigacaoCriterioV2 & { falou_com_decisor: boolean; sinais_positivos: string[]; sinais_negativos: string[] }
    explicacao_motivo:   LigacaoCriterioV2 & { foi_claro: boolean }
    geracao_curiosidade: LigacaoCriterioV2 & { gatilhos_utilizados: string[]; fez_diagnostico_na_ligacao: boolean }
    conducao_conversa:   LigacaoCriterioV2 & { fez_perguntas: boolean; manteve_foco_agendamento: boolean }
    pedido_reuniao:      LigacaoCriterioV2 & { fez_convite_claro: boolean; objecoes_recebidas: Array<{ objecao: string; resposta_vendedor: string; foi_bem_tratada: boolean }>; resultado: string }
    comunicacao:         LigacaoCriterioV2 & { tom_voz: string; naturalidade: string }
  }
  qualificacao_lead: {
    autoridade_decisao: LigacaoCriterioV2 & { nivel_autoridade: string }
    interesse_aparente: LigacaoCriterioV2 & { nivel_interesse: string; sinais_compra: string[] }
    contexto_atual?: {
      tem_plano_saude_atual: boolean
      operadora_atual: string
      insatisfacoes_mencionadas: string[]
      numero_vidas: string
    }
  }
  metricas_gerais: {
    nota_geral_vendedor: number
    nota_geral_lead: number
    classificacao_ligacao: 'excelente' | 'boa' | 'regular' | 'fraca'
    classificacao_lead: 'HOT' | 'WARM' | 'COLD'
    probabilidade_agendamento: number
  }
  analise_final: {
    resumo_executivo: string
    top_3_pontos_fortes: string[]
    top_3_pontos_melhoria: string[]
    oportunidades_perdidas_criticas: string[]
    principais_riscos: string[]
    recomendacao_estrategica: string
    proximos_passos_sugeridos: string[]
  }
}

// Legacy alias kept for backwards compat
export type LigacaoResult = LigacaoResultV2

// ─── Followups Agent ─────────────────────────────────────────────────────────

export interface FollowupsResult {
  whatsapp_d1: string
  whatsapp_d3: string
  email_d5: {
    assunto: string
    corpo: string
  }
  proposta_sugerida: string
  interesses_do_lead: string[]
  dores_principais: string[]
  probabilidade_fechamento: 'alta' | 'media' | 'baixa'
}

// ─── Union type ───────────────────────────────────────────────────────────────

export type AgentResult =
  | EvaluatorResult
  | SpinResult
  | LigacaoResult
  | FollowupsResult
