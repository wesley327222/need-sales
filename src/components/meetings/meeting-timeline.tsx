'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import type { Meeting, Analysis } from '@/lib/types/database'
import {
  CheckCircle2,
  Loader2,
  Clock,
  XCircle,
  Upload,
  Mic,
  Brain,
  FileCheck,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type StepStatus = 'done' | 'active' | 'pending' | 'error'

interface TimelineStep {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  status: StepStatus
  timestamp?: string | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function meetingStatusToSteps(meeting: Meeting, analyses: Analysis[]): TimelineStep[] {
  const s = meeting.status
  const isDone = (target: string) => {
    const order = ['pending', 'transcribing', 'processing', 'done']
    return order.indexOf(s) > order.indexOf(target)
  }
  const isActive = (target: string) => s === target
  const isError = s === 'error' || s === 'partial'

  const hasAnalyses = analyses.some(a => a.status === 'done')

  function deriveStep(id: string, label: string, description: string, icon: React.ReactNode, activeCond: string, doneCond: string): TimelineStep {
    let status: StepStatus = 'pending'
    if (isError && id === 'error') status = 'error'
    else if (isDone(doneCond)) status = 'done'
    else if (isActive(activeCond) || isDone(activeCond)) status = 'active'
    return { id, label, description, icon, status }
  }

  return [
    {
      id: 'upload',
      label: 'Upload concluído',
      description: 'Arquivo de áudio recebido',
      icon: <Upload className="h-4 w-4" />,
      status: 'done', // sempre done quando a reunião existe
      timestamp: meeting.created_at,
    },
    {
      id: 'transcribing',
      label: 'Transcrição',
      description: isActive('transcribing')
        ? 'Transcrevendo áudio com Gladia...'
        : isDone('transcribing') ? 'Transcrição concluída'
        : 'Aguardando...',
      icon: <Mic className="h-4 w-4" />,
      status: isError ? 'error' : isDone('transcribing') ? 'done' : isActive('transcribing') ? 'active' : 'pending',
      timestamp: null,
    },
    {
      id: 'processing',
      label: 'Análise IA',
      description: isActive('processing')
        ? 'Agentes de IA processando...'
        : hasAnalyses ? 'Análises concluídas'
        : s === 'done' ? 'Análise concluída'
        : 'Aguardando transcrição...',
      icon: <Brain className="h-4 w-4" />,
      status: s === 'done' || hasAnalyses ? 'done' : isActive('processing') ? 'active' : 'pending',
      timestamp: null,
    },
    {
      id: 'done',
      label: 'Concluído',
      description: s === 'done' ? 'Resultado disponível' : 'Aguardando análise...',
      icon: <FileCheck className="h-4 w-4" />,
      status: s === 'done' ? 'done' : s === 'error' || s === 'partial' ? 'error' : 'pending',
      timestamp: s === 'done' ? meeting.created_at : null,
    },
  ]
}

function StepIcon({ status, icon }: { status: StepStatus; icon: React.ReactNode }) {
  const base = 'flex h-8 w-8 items-center justify-center rounded-full border-2'
  if (status === 'done') return (
    <div className={cn(base, 'border-green-500 bg-green-50 text-green-600')}>
      <CheckCircle2 className="h-4 w-4" />
    </div>
  )
  if (status === 'active') return (
    <div className={cn(base, 'border-blue-500 bg-blue-50 text-blue-600')}>
      <Loader2 className="h-4 w-4 animate-spin" />
    </div>
  )
  if (status === 'error') return (
    <div className={cn(base, 'border-red-400 bg-red-50 text-red-500')}>
      <XCircle className="h-4 w-4" />
    </div>
  )
  return (
    <div className={cn(base, 'border-slate-200 bg-slate-50 text-slate-300')}>
      <Clock className="h-4 w-4" />
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface MeetingTimelineProps {
  initialMeeting: Meeting
  initialAnalyses: Analysis[]
}

export function MeetingTimeline({ initialMeeting, initialAnalyses }: MeetingTimelineProps) {
  const supabase = createClient()
  const [meeting, setMeeting] = useState<Meeting>(initialMeeting)
  const [analyses, setAnalyses] = useState<Analysis[]>(initialAnalyses)

  useEffect(() => {
    const channel = supabase
      .channel(`meeting-status-${meeting.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'meetings', filter: `id=eq.${meeting.id}` },
        (payload) => setMeeting(payload.new as Meeting)
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'analyses', filter: `meeting_id=eq.${meeting.id}` },
        (payload) => setAnalyses(prev => [...prev, payload.new as Analysis])
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'analyses', filter: `meeting_id=eq.${meeting.id}` },
        (payload) => setAnalyses(prev =>
          prev.map(a => a.id === (payload.new as Analysis).id ? payload.new as Analysis : a)
        )
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [meeting.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const steps = meetingStatusToSteps(meeting, analyses)

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <h3 className="mb-4 text-sm font-semibold text-slate-700">Progresso</h3>
      <ol className="relative space-y-0">
        {steps.map((step, i) => (
          <li key={step.id} className="flex gap-4">
            {/* Linha conectora */}
            <div className="flex flex-col items-center">
              <StepIcon status={step.status} icon={step.icon} />
              {i < steps.length - 1 && (
                <div className={cn(
                  'mt-1 mb-1 w-0.5 flex-1 min-h-[24px]',
                  step.status === 'done' ? 'bg-green-200' : 'bg-slate-100'
                )} />
              )}
            </div>

            {/* Conteúdo */}
            <div className={cn('pb-5 pt-0.5', i === steps.length - 1 && 'pb-0')}>
              <p className={cn(
                'text-sm font-medium',
                step.status === 'done' ? 'text-green-700' :
                step.status === 'active' ? 'text-blue-700' :
                step.status === 'error' ? 'text-red-600' :
                'text-slate-400'
              )}>
                {step.label}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">{step.description}</p>
              {step.timestamp && (
                <p className="text-xs text-slate-400 mt-0.5">
                  {new Date(step.timestamp).toLocaleString('pt-BR')}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
