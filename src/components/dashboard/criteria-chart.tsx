import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function CriteriaChart() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium">Critérios de Avaliação</CardTitle>
      </CardHeader>
      <CardContent className="h-48 flex items-center justify-center">
        <p className="text-sm text-slate-400">Gráfico em construção — Fase 2</p>
      </CardContent>
    </Card>
  )
}
