'use client'

import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  Tooltip, Legend,
} from 'chart.js'
import { Line } from 'react-chartjs-2'
import { V } from './colors'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend)

interface ChartData {
  labels: string[]
  geral: number[]
  objecoes: number[]
  apresentacao: number[]
  escuta: number[]
  spin: number[]
}

const COLORS = {
  geral: '#00E5A0',
  objecoes: '#4F8EF7',
  apresentacao: '#F59E0B',
  escuta: '#A78BFA',
  spin: '#F472B6',
}

const LABELS: Record<keyof Omit<ChartData, 'labels'>, string> = {
  geral: 'Nota Geral',
  objecoes: 'Objeções',
  apresentacao: 'Apresentação',
  escuta: 'Escuta Ativa',
  spin: 'SPIN Selling',
}

export function InsightsChart({ data }: { data: ChartData }) {
  const keys: (keyof typeof COLORS)[] = ['geral', 'objecoes', 'apresentacao', 'escuta', 'spin']

  const datasets = keys.map(k => ({
    label: LABELS[k],
    data: data[k],
    borderColor: COLORS[k],
    backgroundColor: 'transparent',
    borderWidth: k === 'geral' ? 2.5 : 1.5,
    pointRadius: k === 'geral' ? 3 : 2,
    pointBackgroundColor: COLORS[k],
    tension: 0.35,
    borderDash: k === 'geral' ? [] : [4, 3],
  }))

  return (
    <div style={{ height: 200 }}>
      <Line
        data={{ labels: data.labels, datasets }}
        options={{
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: V.surface2,
              borderColor: V.border2,
              borderWidth: 1,
              titleColor: V.text1,
              bodyColor: V.text2,
              padding: 10,
              cornerRadius: 4,
              titleFont: { family: V.mono, size: 10 },
              bodyFont: { family: V.mono, size: 10 },
            },
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { font: { family: V.mono, size: 9 }, color: V.text3 },
              border: { display: false },
            },
            y: {
              grid: { color: V.border },
              ticks: { font: { family: V.mono, size: 9 }, color: V.text3 },
              border: { display: false },
              min: 0, max: 10,
            },
          },
        }}
      />
    </div>
  )
}

export const CHART_LEGEND = Object.entries(COLORS).map(([k, c]) => ({
  key: k,
  color: c,
  label: LABELS[k as keyof typeof LABELS],
}))
