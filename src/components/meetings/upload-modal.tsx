'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { uploadToStorage, isValidAudioFile, formatBytes } from '@/lib/upload'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Upload, FileAudio, X, Loader2, CheckCircle2 } from 'lucide-react'
import type { Profile } from '@/lib/types/database'

// ─── Zod Schema ──────────────────────────────────────────────────────────────

const uploadSchema = z.object({
  title: z.string().min(1, 'Título obrigatório').max(200),
  type: z.enum(['meeting', 'call']),
  clientName: z.string().max(200).optional(),
  sellerId: z.string().uuid().optional().or(z.literal('')),
  scheduledAt: z.string().optional(),
})

// ─── Types ────────────────────────────────────────────────────────────────────

type UploadStep = 'form' | 'uploading' | 'creating' | 'transcribing' | 'done' | 'error'

interface FormState {
  title: string
  type: 'meeting' | 'call'
  clientName: string
  sellerId: string
  scheduledAt: string
}

interface UploadModalProps {
  open: boolean
  onClose: () => void
}

// ─── Component ───────────────────────────────────────────────────────────────

export function UploadModal({ open, onClose }: UploadModalProps) {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState<FormState>({
    title: '',
    type: 'meeting',
    clientName: '',
    sellerId: '',
    scheduledAt: '',
  })
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [sellers, setSellers] = useState<Pick<Profile, 'id' | 'nome'>[]>([])
  const [uploadProgress, setUploadProgress] = useState(0)
  const [step, setStep] = useState<UploadStep>('form')
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Carregar vendedores quando o modal abre
  useEffect(() => {
    if (!open) return
    setStep('form')
    setError(null)
    setFile(null)
    setUploadProgress(0)
    setFieldErrors({})
    setForm({ title: '', type: 'meeting', clientName: '', sellerId: '', scheduledAt: '' })

    async function loadSellers() {
      const { data } = await supabase.from('profiles').select('id, nome')
      setSellers(data ?? [])
    }
    loadSellers()
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Drag & Drop ───────────────────────────────────────────────────────────

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => setIsDragging(false), [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) {
      if (!isValidAudioFile(dropped)) {
        setError('Formato inválido. Use .mp3, .mp4, .m4a, .wav ou .ogg')
        return
      }
      setFile(dropped)
      setError(null)
    }
  }, [])

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) {
      if (!isValidAudioFile(selected)) {
        setError('Formato inválido. Use .mp3, .mp4, .m4a, .wav ou .ogg')
        return
      }
      setFile(selected)
      setError(null)
    }
  }, [])

  // ─── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit() {
    // Validar formulário
    const parsed = uploadSchema.safeParse(form)
    if (!parsed.success) {
      const errs: Record<string, string> = {}
      parsed.error.issues.forEach(e => { errs[e.path[0] as string] = e.message })
      setFieldErrors(errs)
      return
    }
    if (!file) {
      setError('Selecione um arquivo de áudio')
      return
    }
    setFieldErrors({})
    setError(null)

    try {
      // 1. Obter sessão + perfil do usuário
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sessão expirada. Faça login novamente.')

      const { data: profile } = await supabase
        .from('profiles')
        .select('empresa_id')
        .eq('id', session.user.id)
        .single()

      if (!profile?.empresa_id) throw new Error('Empresa não encontrada no perfil.')

      // 2. Upload para Storage com progresso real
      setStep('uploading')
      const ext = file.name.split('.').pop() ?? 'bin'
      const storagePath = `${profile.empresa_id}/${crypto.randomUUID()}.${ext}`

      await uploadToStorage(file, storagePath, session.access_token, setUploadProgress)

      // 3. Criar registro da reunião
      setStep('creating')
      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: parsed.data.title,
          type: parsed.data.type,
          client_name: parsed.data.clientName || null,
          seller_id: parsed.data.sellerId || null,
          scheduled_at: parsed.data.scheduledAt || null,
          audio_url: storagePath,
          audio_filename: file.name,
        }),
      })

      if (!res.ok) {
        const body = await res.json()
        throw new Error(body.error ?? 'Erro ao criar reunião')
      }
      const meeting = await res.json()

      // 4. Disparar transcrição
      setStep('transcribing')
      await fetch(`/api/meetings/${meeting.id}/process`, { method: 'POST' })

      // 5. Navegar para página da reunião
      setStep('done')
      onClose()
      router.push(`/meetings/${meeting.id}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setStep('error')
    }
  }

  const isLoading = ['uploading', 'creating', 'transcribing'].includes(step)

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={isLoading ? undefined : onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === 'done' ? 'Upload concluído!' : 'Nova Reunião / Ligação'}
          </DialogTitle>
        </DialogHeader>

        {/* Formulário */}
        {(step === 'form' || step === 'error') && (
          <div className="space-y-4">
            {/* Título */}
            <div className="space-y-1.5">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                placeholder="Ex: Reunião com Empresa X — Proposta Comercial"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
              {fieldErrors.title && <p className="text-xs text-red-500">{fieldErrors.title}</p>}
            </div>

            {/* Tipo */}
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <div className="flex gap-2">
                {(['meeting', 'call'] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, type: t }))}
                    className={cn(
                      'flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-colors',
                      form.type === t
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    )}
                  >
                    {t === 'meeting' ? '📹 Reunião' : '📞 Ligação'}
                  </button>
                ))}
              </div>
            </div>

            {/* Vendedor */}
            {sellers.length > 0 && (
              <div className="space-y-1.5">
                <Label>Vendedor</Label>
                <Select
                  value={form.sellerId}
                  onValueChange={v => setForm(f => ({ ...f, sellerId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o vendedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {sellers.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.nome}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Nome do cliente */}
            <div className="space-y-1.5">
              <Label htmlFor="clientName">Nome do cliente / lead</Label>
              <Input
                id="clientName"
                placeholder="Ex: João Silva — Acme Corp"
                value={form.clientName}
                onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))}
              />
            </div>

            {/* Data e hora */}
            <div className="space-y-1.5">
              <Label htmlFor="scheduledAt">Data e horário</Label>
              <Input
                id="scheduledAt"
                type="datetime-local"
                value={form.scheduledAt}
                onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))}
              />
            </div>

            {/* Drag & Drop Zone */}
            <div className="space-y-1.5">
              <Label>Arquivo de áudio</Label>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-colors',
                  isDragging
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
                )}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".mp3,.mp4,.m4a,.wav,.ogg,.webm,audio/*,video/mp4"
                  className="sr-only"
                  onChange={handleFileChange}
                />

                {file ? (
                  <div className="flex items-center gap-3">
                    <FileAudio className="h-8 w-8 text-blue-600 shrink-0" />
                    <div className="text-left">
                      <p className="text-sm font-medium text-slate-900 line-clamp-1">{file.name}</p>
                      <p className="text-xs text-slate-500">{formatBytes(file.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); setFile(null) }}
                      className="ml-auto text-slate-400 hover:text-red-500 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="mb-2 h-8 w-8 text-slate-400" />
                    <p className="text-sm font-medium text-slate-600">
                      Arraste o arquivo aqui ou clique para selecionar
                    </p>
                    <p className="mt-1 text-xs text-slate-400">.mp3, .mp4, .m4a, .wav — até 500 MB</p>
                  </>
                )}
              </div>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={onClose}>Cancelar</Button>
              <Button className="flex-1" onClick={handleSubmit} disabled={!file || !form.title}>
                Enviar e Analisar
              </Button>
            </div>
          </div>
        )}

        {/* Progresso */}
        {isLoading && (
          <div className="space-y-6 py-4">
            <UploadStepIndicator step={step} progress={uploadProgress} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ─── Upload Steps Indicator ───────────────────────────────────────────────────

function UploadStepIndicator({ step, progress }: { step: UploadStep; progress: number }) {
  const steps: { key: UploadStep; label: string; description: string }[] = [
    { key: 'uploading', label: 'Enviando arquivo', description: 'Fazendo upload do áudio...' },
    { key: 'creating', label: 'Criando reunião', description: 'Salvando dados no sistema...' },
    { key: 'transcribing', label: 'Iniciando transcrição', description: 'Enviando para o Gladia...' },
  ]

  return (
    <div className="space-y-4">
      {steps.map(({ key, label, description }, i) => {
        const stepIndex = ['uploading', 'creating', 'transcribing'].indexOf(step)
        const thisIndex = i
        const isDone = thisIndex < stepIndex
        const isActive = thisIndex === stepIndex

        return (
          <div key={key} className="flex items-start gap-3">
            <div className={cn(
              'mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold',
              isDone ? 'bg-green-100 text-green-600' :
              isActive ? 'bg-blue-100 text-blue-600' :
              'bg-slate-100 text-slate-400'
            )}>
              {isDone
                ? <CheckCircle2 className="h-4 w-4" />
                : isActive
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : i + 1}
            </div>
            <div className="flex-1">
              <p className={cn('text-sm font-medium', isActive ? 'text-slate-900' : isDone ? 'text-green-700' : 'text-slate-400')}>
                {label}
              </p>
              {isActive && <p className="text-xs text-slate-500">{description}</p>}
              {isActive && key === 'uploading' && (
                <div className="mt-2 space-y-1">
                  <Progress value={progress} className="h-1.5" />
                  <p className="text-xs text-slate-500">{progress}%</p>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
