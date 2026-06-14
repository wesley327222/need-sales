import { Badge } from '@/components/ui/badge'
import type { MeetingStatus } from '@/lib/types/database'

const statusMap: Record<MeetingStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  processando:  { label: 'Processando',   variant: 'default' },
  processado:   { label: 'Concluído',     variant: 'default' },
  erro:         { label: 'Erro',          variant: 'destructive' },
  pending:      { label: 'Pendente',      variant: 'secondary' },
  transcribing: { label: 'Transcrevendo', variant: 'default' },
  processing:   { label: 'Processando',   variant: 'default' },
  done:         { label: 'Concluído',     variant: 'default' },
  partial:      { label: 'Parcial',       variant: 'outline' },
  error:        { label: 'Erro',          variant: 'destructive' },
}

export function StatusBadge({ status }: { status: MeetingStatus }) {
  const { label, variant } = statusMap[status]
  return <Badge variant={variant}>{label}</Badge>
}
