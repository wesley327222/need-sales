'use client'

import dynamic from 'next/dynamic'

const InsightsChartInner = dynamic(
  () => import('./insights-chart').then(m => m.InsightsChart),
  {
    ssr: false,
    loading: () => (
      <div style={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4A4A56', fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
        Carregando gráfico…
      </div>
    ),
  }
)

interface ChartData {
  labels: string[]
  geral: number[]
  objecoes: number[]
  apresentacao: number[]
  escuta: number[]
  spin: number[]
}

export function InsightsChartLazy({ data }: { data: ChartData }) {
  return <InsightsChartInner data={data} />
}
