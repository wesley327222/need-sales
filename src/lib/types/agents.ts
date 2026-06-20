// ─── Evaluator Agent (Reuniões) ──────────────────────────────────────────────

export interface ObjecaoAvaliada {
  numero: number
  texto: string
  status: 'quebrada' | 'parcial' | 'nao_quebrada'
  como_tratou: string
  sugestao_quebra: string
}

// Critério opcional genérico — usado por qualquer critério selecionável pelo gestor
// (escuta_ativa, apresentacao, firmeza, rapport, urgencia em reuniões; acesso_decisor,
// explicacao_motivo, geracao_curiosidade, conducao_conversa, comunicacao em ligações)
export interface CriterioGenericoResult {
  nota: number
  justificativa: string
  evidencias: string[]
  sugestoes: string[]
}

export interface QuebraObjecoesResult {
  nota: number
  justificativa: string
  evidencias: string[]
  sugestoes: string[]
  objecoes: ObjecaoAvaliada[]
}

export interface EvaluatorResult {
  quebra_objecoes: QuebraObjecoesResult
  criterios_opcionais: Record<string, CriterioGenericoResult>
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

export interface PedidoReuniaoResult {
  nota: number
  justificativa: string
  evidencias: LigacaoEvidencia[]
  fez_convite_claro: boolean
  explicou_duracao_reuniao: boolean
  sugeriu_horarios_especificos: boolean
  objecoes_recebidas: Array<{ objecao: string; resposta_vendedor: string; foi_bem_tratada: boolean }>
  resultado: 'agendado' | 'pendente' | 'recusado' | 'nao_pediu'
}

export interface LigacaoResultV2 {
  pedido_reuniao: PedidoReuniaoResult
  criterios_opcionais: Record<string, CriterioGenericoResult>
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
