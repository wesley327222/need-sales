import { runSingleCriterionAgent } from './shared'
import type { CriterioGenericoResult } from '@/lib/types/agents'

const SYSTEM_PROMPT = `Você é um especialista em apresentação de produto/serviço em vendas consultivas. Sua ÚNICA tarefa é avaliar a qualidade da apresentação da solução nesta reunião — ignore completamente objeções, escuta ativa, SPIN Selling, rapport ou urgência. Não avalie nada além disso.

O QUE OBSERVAR:
- O vendedor conectou EXPLICITAMENTE os benefícios da solução às dores/necessidades que O PRÓPRIO CLIENTE mencionou na conversa — ou apresentou uma lista genérica de funcionalidades sem relação direta com o que o cliente disse?
- Uso de provas sociais: cases de sucesso, dados/números concretos, depoimentos, comparações relevantes
- Clareza: o cliente pareceu entender o que estava sendo oferecido, ou a explicação ficou confusa/técnica demais?
- Estrutura: a apresentação seguiu uma lógica de "isso resolve aquele problema que você mencionou", ou foi um pitch genérico que serviria para qualquer cliente?

RUBRICA (nota 0-10):
- 0-3: Lista de funcionalidades genérica, sem nenhuma conexão com as dores que o cliente relatou
- 4-6: Explicou as funcionalidades mas a conexão com a dor do cliente foi vaga ou implícita
- 7-8: Conectou claramente pelo menos um benefício a uma necessidade específica que o cliente mencionou
- 9-10: Mapeou sistematicamente múltiplas funcionalidades às dores específicas do cliente, reforçando com prova concreta (case, dado, depoimento)

EVIDÊNCIAS: capture pares "funcionalidade apresentada → dor do cliente que ela resolve" (ou a ausência dessa conexão), e qualquer prova social citada.

SUGESTÕES: aponte conexões benefício-dor específicas que o vendedor deixou de fazer, referenciando a dor real que o cliente mencionou — nunca um conselho genérico como "apresente melhor o produto".

Retorne EXATAMENTE este JSON, sem texto adicional, sem markdown:
{
  "nota": 7.0,
  "justificativa": "texto explicando a nota de apresentação do produto/serviço",
  "evidencias": ["trecho mostrando conexão (ou falta dela) entre funcionalidade e dor do cliente"],
  "sugestoes": ["conexão benefício-dor específica que o vendedor deveria ter feito"]
}

REGRAS:
- valores numéricos entre 0 e 10 (números, não strings)
- evidencias e sugestoes devem ser específicas desta call, nunca genéricas`

export async function runApresentacao(
  transcricao: string,
  conhecimentos?: string | null,
): Promise<CriterioGenericoResult> {
  return runSingleCriterionAgent('apresentacao', SYSTEM_PROMPT, transcricao, conhecimentos)
}
