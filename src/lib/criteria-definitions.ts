// Definições de critérios de avaliação de IA — client-safe (sem imports de servidor).
// Usado tanto pelo backend (ai-config.ts, agentes, rotas) quanto pela UI de configurações.

export interface CriterionDef {
  key: string
  label: string
  descricao: string
  obrigatorio: boolean
}

export const CRITERIOS_REUNIAO: CriterionDef[] = [
  { key: 'quebra_objecoes', label: 'Quebra de Objeções',     descricao: 'Identificação e resposta às objeções do cliente com argumentos sólidos', obrigatorio: true },
  { key: 'spin_selling',    label: 'SPIN Selling',           descricao: 'Uso de perguntas de Situação, Problema, Implicação e Necessidade',        obrigatorio: true },
  { key: 'escuta_ativa',    label: 'Escuta Ativa',           descricao: 'Perguntas abertas, empatia, adaptação ao discurso conforme as respostas',  obrigatorio: false },
  { key: 'apresentacao',    label: 'Apresentação do Produto', descricao: 'Clareza, conexão de benefícios às dores do cliente, provas sociais',       obrigatorio: false },
  { key: 'firmeza',         label: 'Firmeza / Assertividade', descricao: 'Condução segura da conversa, sem hesitação, postura de autoridade',       obrigatorio: false },
  { key: 'rapport',         label: 'Rapport / Empatia',       descricao: 'Conexão humana, tom empático, construção de clima de confiança',          obrigatorio: false },
  { key: 'urgencia',        label: 'Criação de Urgência',     descricao: 'Motivação para decisão rápida sem pressão excessiva ou antiética',        obrigatorio: false },
]

export const CRITERIOS_LIGACAO: CriterionDef[] = [
  { key: 'pedido_reuniao',      label: 'Pedido de Reunião',      descricao: 'Tentativa efetiva de agendar o próximo passo, com tratamento de objeções', obrigatorio: true },
  { key: 'acesso_decisor',      label: 'Acesso ao Decisor',      descricao: 'Conseguiu identificar e falar com quem decide a compra',                  obrigatorio: false },
  { key: 'explicacao_motivo',   label: 'Explicação do Motivo',   descricao: 'Clareza ao explicar o motivo do contato e a proposta de valor',           obrigatorio: false },
  { key: 'geracao_curiosidade', label: 'Geração de Curiosidade', descricao: 'Despertou interesse real usando gatilhos relevantes ao contexto do cliente', obrigatorio: false },
  { key: 'conducao_conversa',   label: 'Condução da Conversa',   descricao: 'Controle do diálogo, equilíbrio entre fala e escuta, foco no agendamento', obrigatorio: false },
  { key: 'comunicacao',         label: 'Comunicação',            descricao: 'Tom de voz, naturalidade, clareza e empatia percebida na ligação',        obrigatorio: false },
]

export const MAX_OPTIONAL_CRITERIA = 4

export function getCriteriaDefs(tipo: 'reuniao' | 'ligacao'): CriterionDef[] {
  return tipo === 'reuniao' ? CRITERIOS_REUNIAO : CRITERIOS_LIGACAO
}
