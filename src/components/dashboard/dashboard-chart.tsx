'use client'

import { useEffect, useRef } from 'react'
import {
  Chart,
  LineController, LineElement, PointElement,
  LinearScale, CategoryScale,
  Tooltip, Legend, Filler,
} from 'chart.js'

Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler)

export interface ChartDataset {
  label: string
  data: number[]
  color: string
  dashed?: boolean
}

interface Props {
  labels: string[]
  datasets: ChartDataset[]
}

const D = {
  border:  '#1E1E22',
  border2: '#2A2A30',
  text3:   '#4A4A56',
  surface2:'#18181B',
  text1:   '#F0F0F4',
  text2:   '#8A8A96',
}

export function DashboardChart({ labels, datasets }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const chartRef  = useRef<Chart | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    if (chartRef.current) { chartRef.current.destroy(); chartRef.current = null }

    chartRef.current = new Chart(canvasRef.current, {
      type: 'line',
      data: {
        labels,
        datasets: datasets.map(ds => ({
          label: ds.label,
          data: ds.data,
          borderColor: ds.color,
          backgroundColor: 'transparent',
          borderWidth: ds.dashed ? 1.5 : 2.5,
          pointRadius: ds.dashed ? 2 : 3,
          pointBackgroundColor: ds.color,
          tension: 0.35,
          borderDash: ds.dashed ? [4, 3] : [],
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: D.surface2,
            borderColor: D.border,
            borderWidth: 1,
            titleColor: D.text1,
            bodyColor: D.text2,
            padding: 10,
            cornerRadius: 4,
            titleFont: { family: "'JetBrains Mono'", size: 10 },
            bodyFont:  { family: "'JetBrains Mono'", size: 10 },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { family: "'JetBrains Mono'", size: 9 }, color: D.text3 },
            border: { display: false },
          },
          y: {
            grid: { color: D.border },
            ticks: { font: { family: "'JetBrains Mono'", size: 9 }, color: D.text3 },
            border: { display: false },
            min: 4, max: 10,
          },
        },
      },
    })

    return () => { chartRef.current?.destroy(); chartRef.current = null }
  }, [labels, datasets])

  return <canvas ref={canvasRef} style={{ width: '100%', height: '100%' }} />
}
