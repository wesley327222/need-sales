import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from './status-badge'
import { formatScore } from '@/lib/utils'
import type { MeetingStatus, MeetingType } from '@/lib/types/database'
import { Video, PhoneCall, Calendar } from 'lucide-react'

interface MeetingCardProps {
  id?: string
  title: string
  clientName: string | null
  status: MeetingStatus
  score: number | null
  date: string
  type: MeetingType
}

export function MeetingCard({ id, title, clientName, status, score, date, type }: MeetingCardProps) {
  const href = type === 'meeting' ? `/meetings/${id}` : `/calls/${id}`

  return (
    <Link href={id ? href : '#'}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-sm font-semibold text-slate-900 line-clamp-2">{title}</CardTitle>
            <StatusBadge status={status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            {type === 'meeting' ? <Video className="h-3 w-3" /> : <PhoneCall className="h-3 w-3" />}
            <span>{clientName ?? 'Cliente não informado'}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Calendar className="h-3 w-3" />
              <span>{new Date(date).toLocaleDateString('pt-BR')}</span>
            </div>
            {score !== null && (
              <span className="text-sm font-bold text-blue-600">{formatScore(score)}</span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}
