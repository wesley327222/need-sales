'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { uploadToStorage, isValidAudioFile, formatBytes, extractAudioFromVideo, MAX_UPLOAD_BYTES } from '@/lib/upload'
import { V } from './colors'

interface VendorUploadModalProps {
  open: boolean
  onClose: () => void
  tipo: 'reuniao' | 'ligacao'
  /** Route prefix for redirects. '/vendor' (default) for vendor portal, '' for dashboard. */
  pathPrefix?: string
}

type Step = 'form' | 'extracting' | 'uploading' | 'creating' | 'transcribing' | 'done' | 'error'
type BatchStep = 'form' | 'extracting' | 'preview' | 'uploading' | 'done' | 'error'

interface ExtractedFile {
  name: string
  size: number
  blob: Blob
}

interface Seller { id: string; nome: string }
interface Client { id: string; nome: string }

const AUDIO_EXTS = ['mp3', 'mp4', 'm4a', 'wav', 'ogg', 'webm', 'flac', 'aac']
function isAudioFilename(name: string): boolean {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  return AUDIO_EXTS.includes(ext)
}

const inpStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 4,
  border: `1px solid ${V.border2}`, background: V.surface2,
  color: V.text1, fontSize: 13, fontFamily: V.ui,
  outline: 'none', boxSizing: 'border-box',
}

const selStyle: React.CSSProperties = {
  ...inpStyle,
  appearance: 'none', WebkitAppearance: 'none', cursor: 'pointer',
  backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%234A4A56' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E\")",
  backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center',
  paddingRight: 32,
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontFamily: V.mono, fontSize: 9,
  textTransform: 'uppercase', letterSpacing: '0.1em', color: V.text3, marginBottom: 6,
}

export function VendorUploadModal({ open, onClose, tipo, pathPrefix = '/vendor' }: VendorUploadModalProps) {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const zipInputRef  = useRef<HTMLInputElement>(null)

  // Mode toggle
  const [mode, setMode] = useState<'single' | 'batch'>('single')

  // Options fetched on open
  const [sellers, setSellers]         = useState<Seller[]>([])
  const [clients, setClients]         = useState<Client[]>([])
  const [loadingOpts, setLoadingOpts] = useState(false)

  // Inline new-client form
  const [newClientNome,  setNewClientNome]  = useState('')
  const [newClientEmail, setNewClientEmail] = useState('')
  const [newClientTel,   setNewClientTel]   = useState('')
  const [creatingClient, setCreatingClient] = useState(false)

  // Single mode state
  const [titulo,     setTitulo]     = useState('')
  const [dataHora,   setDataHora]   = useState('')
  const [vendedorId, setVendedorId] = useState('')
  const [clienteId,  setClienteId]  = useState('')
  const [file,       setFile]       = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [step,       setStep]       = useState<Step>('form')
  const [progress,   setProgress]   = useState(0)
  const [error,      setError]      = useState<string | null>(null)

  // Batch mode state
  const [batchName,          setBatchName]          = useState('')
  const [batchPeriodoInicio, setBatchPeriodoInicio] = useState('')
  const [batchPeriodoFim,    setBatchPeriodoFim]    = useState('')
  const [isZipDragging,      setIsZipDragging]      = useState(false)
  const [extractedFiles,     setExtractedFiles]     = useState<ExtractedFile[]>([])
  const [batchStep,          setBatchStep]          = useState<BatchStep>('form')
  const [batchProgress,      setBatchProgress]      = useState({ current: 0, total: 0 })
  const [batchError,         setBatchError]         = useState<string | null>(null)

  // Fetch sellers & clients when modal opens
  useEffect(() => {
    if (!open) return

    // Reset
    setMode('single')
    setTitulo(''); setDataHora(''); setVendedorId(''); setClienteId('')
    setFile(null); setIsDragging(false); setStep('form'); setProgress(0); setError(null)
    setBatchName(''); setBatchPeriodoInicio(''); setBatchPeriodoFim('')
    setExtractedFiles([]); setBatchStep('form')
    setBatchProgress({ current: 0, total: 0 }); setBatchError(null); setIsZipDragging(false)
    setNewClientNome(''); setNewClientEmail(''); setNewClientTel(''); setCreatingClient(false)

    setLoadingOpts(true)
    async function loadOptions() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data: profile } = await supabase
          .from('profiles').select('empresa_id').eq('id', user.id).single()
        if (!profile?.empresa_id) return

        const isVP = pathPrefix === '/vendor'

        const [sRes, myReunioes, myLigacoes] = await Promise.all([
          supabase.from('profiles')
            .select('id, nome')
            .eq('empresa_id', profile.empresa_id)
            .eq('role', 'seller')
            .order('nome'),
          isVP
            ? supabase.from('reunioes').select('cliente_id').eq('vendedor_id', user.id)
            : Promise.resolve({ data: [] as { cliente_id: string | null }[] }),
          isVP
            ? supabase.from('ligacoes').select('cliente_id').eq('vendedor_id', user.id)
            : Promise.resolve({ data: [] as { cliente_id: string | null }[] }),
        ])

        let clientData: Client[] = []
        if (isVP) {
          const myClientIds = [...new Set([
            ...(myReunioes.data ?? []).map(r => r.cliente_id).filter((id): id is string => !!id),
            ...(myLigacoes.data ?? []).map(l => l.cliente_id).filter((id): id is string => !!id),
          ])]
          if (myClientIds.length) {
            const { data } = await supabase.from('clientes').select('id, nome').in('id', myClientIds).order('nome')
            clientData = data ?? []
          }
        } else {
          const { data } = await supabase.from('clientes').select('id, nome').eq('empresa_id', profile.empresa_id).order('nome')
          clientData = data ?? []
        }

        setSellers(sRes.data ?? [])
        setClients(clientData)
        setVendedorId(user.id) // default: current user
      } finally {
        setLoadingOpts(false)
      }
    }
    loadOptions()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const switchMode = useCallback((m: 'single' | 'batch') => {
    setMode(m); setError(null); setBatchError(null)
    setFile(null); setExtractedFiles([]); setBatchStep('form'); setStep('form')
  }, [])

  // --- Single mode ---
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(true)
  }, [])
  const handleDragLeave = useCallback(() => setIsDragging(false), [])
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false)
    const f = e.dataTransfer.files[0]
    if (!f) return
    if (!isValidAudioFile(f)) { setError('Formato inválido. Use .mp3, .mp4, .m4a, .wav ou .ogg'); return }
    if (f.size > MAX_UPLOAD_BYTES) { /* will be converted to MP3 automatically */ }
    setFile(f); setError(null)
  }, [])
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    if (!isValidAudioFile(f)) { setError('Formato inválido. Use .mp3, .mp4, .m4a, .wav ou .ogg'); return }
    if (f.size > MAX_UPLOAD_BYTES) { /* will be converted to MP3 automatically */ }
    setFile(f); setError(null)
  }, [])

  async function handleCreateClient() {
    if (!newClientNome.trim()) return
    setCreatingClient(true)
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: newClientNome.trim(), email: newClientEmail.trim() || null, telefone: newClientTel.trim() || null }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao criar cliente')
      const newClient: Client = { id: data.id, nome: data.nome }
      setClients(prev => [...prev, newClient].sort((a, b) => a.nome.localeCompare(b.nome)))
      setClienteId(data.id)
      setNewClientNome(''); setNewClientEmail(''); setNewClientTel('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar cliente')
    } finally {
      setCreatingClient(false)
    }
  }

  async function handleSingleSubmit() {
    if (!titulo.trim())             { setError('Informe o título'); return }
    if (!file)                      { setError('Selecione um arquivo de áudio'); return }
    if (!isVendorPortal && !vendedorId) { setError('Selecione o vendedor'); return }
    if (clienteId === '__new__')    { setError('Crie o cliente antes de continuar'); return }
    setError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sessão expirada. Faça login novamente.')

      const { data: profile } = await supabase
        .from('profiles').select('empresa_id').eq('id', session.user.id).single()
      if (!profile?.empresa_id) throw new Error('Empresa não encontrada no perfil.')

      // Extract audio from large video files before upload
      let uploadFile = file
      if (file.size > MAX_UPLOAD_BYTES) {
        setStep('extracting')
        setProgress(0)
        uploadFile = await extractAudioFromVideo(file, setProgress)
      }

      setStep('uploading')
      setProgress(0)
      const ext = uploadFile.name.split('.').pop() ?? 'bin'
      const storagePath = `${profile.empresa_id}/${crypto.randomUUID()}.${ext}`
      await uploadToStorage(uploadFile, storagePath, session.access_token, setProgress)

      setStep('creating')
      const res = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo,
          titulo: titulo.trim(),
          data_hora:   dataHora || null,
          vendedor_id: vendedorId,
          cliente_id:  clienteId || null,
          audio_url:      storagePath,
          audio_filename: uploadFile.name,
        }),
      })
      if (!res.ok) {
        const b = await res.json()
        throw new Error(b.error ?? 'Erro ao criar registro')
      }
      const record = await res.json()

      setStep('transcribing')
      const processRes = await fetch(`/api/meetings/${record.id}/process?tipo=${tipo}`, { method: 'POST' })
      if (!processRes.ok) {
        const b = await processRes.json().catch(() => ({}))
        const detail = Array.isArray(b.details) && b.details.length ? `\n${b.details.join('\n')}` : ''
        throw new Error((b.error ?? `Erro na análise (${processRes.status})`) + detail)
      }

      setStep('done')
      onClose()
      router.push(tipo === 'ligacao' ? `${pathPrefix}/calls/${record.id}` : `${pathPrefix}/meetings/${record.id}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
      setStep('error')
    }
  }

  // --- Batch mode ---
  const handleZipDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsZipDragging(true)
  }, [])
  const handleZipDragLeave = useCallback(() => setIsZipDragging(false), [])

  async function processZipFile(f: File) {
    if (!f.name.toLowerCase().endsWith('.zip')) { setBatchError('Selecione um arquivo .zip'); return }
    setBatchError(null); setBatchStep('extracting')
    try {
      const JSZip = (await import('jszip')).default
      const zip   = await JSZip.loadAsync(f)
      const entries = Object.values(zip.files).filter(e => !e.dir && isAudioFilename(e.name))
      const result: ExtractedFile[] = []
      for (const entry of entries) {
        const blob = await entry.async('blob')
        const shortName = entry.name.split('/').pop() ?? entry.name
        result.push({ name: shortName, size: blob.size, blob })
      }
      result.sort((a, b) => b.size - a.size)
      const top10 = result.slice(0, 10)
      if (top10.length === 0) { setBatchError('Nenhum arquivo de áudio no ZIP'); setBatchStep('form'); return }
      setBatchName(f.name.replace(/\.zip$/i, ''))
      setExtractedFiles(top10); setBatchStep('preview')
    } catch (err) {
      setBatchError('Erro ao extrair ZIP: ' + (err instanceof Error ? err.message : 'desconhecido'))
      setBatchStep('form')
    }
  }

  const handleZipDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setIsZipDragging(false)
    const f = e.dataTransfer.files[0]; if (f) processZipFile(f)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const handleZipInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (f) processZipFile(f)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function handleBatchSubmit() {
    if (!batchName.trim())                    { setBatchError('Informe o nome do pack'); return }
    if (!isVendorPortal && !vendedorId)       { setBatchError('Selecione o vendedor'); return }
    if (clienteId === '__new__')              { setBatchError('Crie o cliente antes de continuar'); return }
    if (extractedFiles.length === 0)          { setBatchError('Nenhum arquivo para processar'); return }
    setBatchError(null)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Sessão expirada. Faça login novamente.')

      const { data: profile } = await supabase
        .from('profiles').select('empresa_id').eq('id', session.user.id).single()
      if (!profile?.empresa_id) throw new Error('Empresa não encontrada no perfil.')

      const loteRes = await fetch('/api/lotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome:           batchName.trim(),
          total_ligacoes: extractedFiles.length,
          vendedor_id:    vendedorId || null,
          periodo_inicio: batchPeriodoInicio || null,
          periodo_fim:    batchPeriodoFim    || null,
        }),
      })
      if (!loteRes.ok) { const b = await loteRes.json(); throw new Error(b.error ?? 'Erro ao criar pack') }
      const lote = await loteRes.json()
      const loteId = lote.id as string

      setBatchStep('uploading'); setBatchProgress({ current: 0, total: extractedFiles.length })

      // Distribute ligações evenly across the period when both dates are set
      const totalFiles = extractedFiles.length
      const periodoMs = batchPeriodoInicio && batchPeriodoFim
        ? new Date(batchPeriodoFim).getTime() - new Date(batchPeriodoInicio).getTime()
        : 0

      for (let i = 0; i < extractedFiles.length; i++) {
        const ef = extractedFiles[i]
        setBatchProgress({ current: i + 1, total: extractedFiles.length })

        // Compute an evenly-spaced date within the period for each call
        let dataHora: string | null = null
        if (batchPeriodoInicio) {
          if (periodoMs > 0 && totalFiles > 1) {
            const offset = Math.round((periodoMs / (totalFiles - 1)) * i)
            dataHora = new Date(new Date(batchPeriodoInicio).getTime() + offset).toISOString()
          } else {
            dataHora = new Date(batchPeriodoInicio).toISOString()
          }
        }

        try {
          const ext = ef.name.split('.').pop() ?? 'mp3'
          const storagePath = `${profile.empresa_id}/${crypto.randomUUID()}.${ext}`
          const fileObj = new File([ef.blob], ef.name, { type: 'audio/mpeg' })
          await uploadToStorage(fileObj, storagePath, session.access_token, () => {})
          const meetRes = await fetch('/api/meetings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tipo:           'ligacao',
              titulo:         ef.name.replace(/\.[^.]+$/, ''),
              data_hora:      dataHora,
              vendedor_id:    vendedorId,
              cliente_id:     clienteId || null,
              audio_url:      storagePath,
              audio_filename: ef.name,
              lote_id:        loteId,
            }),
          })
          if (!meetRes.ok) continue
          const record = await meetRes.json()
          fetch(`/api/meetings/${record.id}/process?tipo=ligacao`, { method: 'POST' }).catch(() => {})
        } catch { /* continue */ }
      }

      setBatchStep('done'); onClose()
      // Dashboard doesn't have a batch report page yet — redirect to calls list
      const batchPath = pathPrefix === '/vendor' ? `/vendor/calls/batch/${loteId}` : `${pathPrefix}/calls`
      router.push(batchPath); router.refresh()
    } catch (err) {
      setBatchError(err instanceof Error ? err.message : 'Erro desconhecido'); setBatchStep('form')
    }
  }

  if (!open) return null

  const isSingleLoading = ['extracting', 'uploading', 'creating', 'transcribing'].includes(step)
  const isAnyLoading    = isSingleLoading || batchStep === 'uploading' || batchStep === 'extracting'
  const modalTitle      = tipo === 'ligacao'
    ? (mode === 'batch' ? 'Pack de Ligações (ZIP)' : 'Nova Ligação')
    : 'Nova Reunião'
  const singleStepLabel: Record<string, string> = {
    extracting: 'Convertendo para MP3...', uploading: 'Enviando arquivo...', creating: 'Criando registro...', transcribing: 'Iniciando análise de IA...',
  }

  const isVendorPortal = pathPrefix === '/vendor'

  const SellerClientFields = (
    <div style={{ display: 'grid', gridTemplateColumns: isVendorPortal ? '1fr' : '1fr 1fr', gap: 10, marginBottom: 14 }}>
      {/* Vendedor — only shown in gestor/dashboard, vendor auto-assigned */}
      {!isVendorPortal && (
        <div>
          <label style={labelStyle}>Vendedor *</label>
          {loadingOpts ? (
            <div style={{ ...inpStyle, color: V.text3 }}>Carregando...</div>
          ) : (
            <select value={vendedorId} onChange={e => setVendedorId(e.target.value)} style={selStyle}>
              <option value="">Selecione...</option>
              {sellers.map(s => (
                <option key={s.id} value={s.id}>{s.nome}</option>
              ))}
            </select>
          )}
        </div>
      )}
      {/* Cliente */}
      <div>
        <label style={labelStyle}>Cliente</label>
        {loadingOpts ? (
          <div style={{ ...inpStyle, color: V.text3 }}>Carregando...</div>
        ) : (
          <>
            <select
              value={clienteId}
              onChange={e => {
                setClienteId(e.target.value)
                if (e.target.value !== '__new__') { setNewClientNome(''); setNewClientEmail(''); setNewClientTel('') }
              }}
              style={selStyle}
            >
              <option value="">Sem cliente</option>
              <option value="__new__">➕ Criar novo cliente</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
            {clienteId === '__new__' && (
              <div style={{ marginTop: 8, padding: 12, background: '#0A0A0B', border: `1px solid ${V.border2}`, borderRadius: 4, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input
                  value={newClientNome}
                  onChange={e => setNewClientNome(e.target.value)}
                  placeholder="Nome do cliente *"
                  style={inpStyle}
                  autoFocus
                />
                <input
                  type="email"
                  value={newClientEmail}
                  onChange={e => setNewClientEmail(e.target.value)}
                  placeholder="E-mail (opcional)"
                  style={inpStyle}
                />
                <input
                  value={newClientTel}
                  onChange={e => setNewClientTel(e.target.value)}
                  placeholder="Telefone (opcional)"
                  style={inpStyle}
                />
                <button
                  type="button"
                  onClick={handleCreateClient}
                  disabled={!newClientNome.trim() || creatingClient}
                  style={{
                    padding: '7px 14px', borderRadius: 4, border: 'none', alignSelf: 'flex-start',
                    background: (!newClientNome.trim() || creatingClient) ? V.border2 : V.accent,
                    color: (!newClientNome.trim() || creatingClient) ? V.text3 : '#000',
                    fontSize: 12, fontFamily: V.ui, fontWeight: 700,
                    cursor: (!newClientNome.trim() || creatingClient) ? 'default' : 'pointer',
                  }}
                >
                  {creatingClient ? 'Criando...' : 'Criar cliente'}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 50, fontFamily: V.ui,
    }}>
      <div style={{
        width: mode === 'batch' && batchStep === 'preview'
          ? 'min(560px, calc(100vw - 40px))'
          : 'min(520px, calc(100vw - 40px))',
        background: V.surface, border: `1px solid ${V.border}`,
        borderRadius: 6, overflow: 'hidden',
        maxHeight: 'calc(100vh - 60px)', overflowY: 'auto',
        transition: 'width 0.2s',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px', borderBottom: `1px solid ${V.border}`,
          position: 'sticky', top: 0, background: V.surface, zIndex: 1,
        }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: V.text1 }}>{modalTitle}</span>
          {!isAnyLoading && (
            <button onClick={onClose} style={{
              background: 'none', border: 'none', color: V.text3, cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 2,
            }}>✕</button>
          )}
        </div>

        {/* Mode toggle — only for ligação */}
        {tipo === 'ligacao' && !isAnyLoading &&
         (step === 'form' || step === 'error') &&
         (batchStep === 'form' || batchStep === 'preview' || batchStep === 'error') && (
          <div style={{
            display: 'flex', background: V.surface2, borderBottom: `1px solid ${V.border}`,
            padding: '10px 20px', gap: 6,
          }}>
            {(['single', 'batch'] as const).map(m => (
              <button key={m} type="button" onClick={() => switchMode(m)} style={{
                padding: '6px 14px', borderRadius: 4, border: 'none',
                background: mode === m ? V.surface : 'transparent',
                color: mode === m ? V.text1 : V.text3,
                fontSize: 12, fontFamily: V.ui, fontWeight: mode === m ? 700 : 400,
                cursor: 'pointer', boxShadow: mode === m ? `0 0 0 1px ${V.border2}` : 'none',
              }}>
                {m === 'single' ? '🎵 Ligação única' : '📦 Pack ZIP'}
              </button>
            ))}
          </div>
        )}

        {/* Body */}
        <div style={{ padding: '20px' }}>

          {/* ===== SINGLE MODE ===== */}
          {mode === 'single' && (
            <>
              {(step === 'form' || step === 'error') && (
                <div>
                  {/* Título */}
                  <div style={{ marginBottom: 14 }}>
                    <label style={labelStyle}>Título *</label>
                    <input
                      type="text"
                      placeholder={tipo === 'ligacao' ? 'Ex: Prospecção — Empresa X' : 'Ex: Reunião de Proposta — Empresa X'}
                      value={titulo}
                      onChange={e => setTitulo(e.target.value)}
                      style={inpStyle}
                      autoFocus
                    />
                  </div>

                  {/* Vendedor + Cliente */}
                  {SellerClientFields}

                  {/* Data e Hora */}
                  <div style={{ marginBottom: 14 }}>
                    <label style={labelStyle}>Data e Hora</label>
                    <input
                      type="datetime-local"
                      value={dataHora}
                      onChange={e => setDataHora(e.target.value)}
                      style={{ ...inpStyle, colorScheme: 'dark' }}
                    />
                  </div>

                  {/* Drop zone */}
                  <div style={{ marginBottom: 18 }}>
                    <label style={labelStyle}>Arquivo de Áudio *</label>
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        border: `2px dashed ${isDragging ? V.accent : V.border2}`,
                        borderRadius: 5, padding: '24px 20px', textAlign: 'center',
                        cursor: 'pointer', background: isDragging ? V.accentDim : V.surface2,
                        transition: 'border-color 0.15s, background 0.15s',
                      }}
                    >
                      <input ref={fileInputRef} type="file" accept=".mp3,.mp4,.m4a,.wav,.ogg,.webm,audio/*" style={{ display: 'none' }} onChange={handleFileChange} />
                      {file ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
                          <span style={{ fontSize: 20 }}>🎵</span>
                          <div style={{ textAlign: 'left' }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: V.text1 }}>{file.name}</div>
                            <div style={{ fontSize: 11, color: V.text3 }}>{formatBytes(file.size)}</div>
                          </div>
                          <button type="button" onClick={e => { e.stopPropagation(); setFile(null) }}
                            style={{ marginLeft: 8, background: 'none', border: 'none', color: V.text3, cursor: 'pointer', fontSize: 16 }}>✕</button>
                        </div>
                      ) : (
                        <>
                          <div style={{ fontSize: 22, marginBottom: 8 }}>☁</div>
                          <div style={{ fontSize: 13, color: V.text2, marginBottom: 4 }}>Arraste o arquivo ou clique para selecionar</div>
                          <div style={{ fontFamily: V.mono, fontSize: 10, color: V.text3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>MP3 · WAV · M4A · MP4 · OGG</div>
                        </>
                      )}
                    </div>
                  </div>

                  {error && (
                    <div style={{ marginBottom: 14, padding: '8px 12px', borderRadius: 4, background: 'rgba(255,68,85,0.08)', border: '1px solid rgba(255,68,85,0.2)', fontSize: 12, color: '#FF4455' }}>
                      {error}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={onClose} style={{
                      flex: 1, padding: '9px', borderRadius: 4,
                      border: `1px solid ${V.border2}`, background: V.surface2,
                      color: V.text2, fontSize: 13, fontFamily: V.ui, fontWeight: 600, cursor: 'pointer',
                    }}>Cancelar</button>
                    <button
                      onClick={handleSingleSubmit}
                      disabled={!file || !titulo.trim() || (!isVendorPortal && !vendedorId)}
                      style={{
                        flex: 1, padding: '9px', borderRadius: 4, border: 'none',
                        background: (!file || !titulo.trim() || (!isVendorPortal && !vendedorId)) ? V.text3 : V.accent,
                        color: '#000', fontSize: 13, fontFamily: V.ui, fontWeight: 700,
                        cursor: (!file || !titulo.trim() || (!isVendorPortal && !vendedorId)) ? 'default' : 'pointer',
                      }}
                    >Enviar e Analisar</button>
                  </div>
                </div>
              )}

              {isSingleLoading && (
                <div style={{ padding: '12px 0' }}>
                  <div style={{ fontSize: 13, color: V.text2, marginBottom: 16 }}>{singleStepLabel[step]}</div>
                  {(step === 'extracting' || step === 'uploading') && (
                    <div>
                      <div style={{ height: 3, background: V.border2, borderRadius: 2, marginBottom: 8 }}>
                        <div style={{ width: `${progress}%`, height: 3, background: step === 'extracting' ? V.amber : V.accent, borderRadius: 2, transition: 'width 0.3s' }} />
                      </div>
                      <div style={{ fontFamily: V.mono, fontSize: 10, color: V.text3 }}>
                        {step === 'extracting' ? `${progress}% — convertendo para MP3` : `${progress}%`}
                      </div>
                    </div>
                  )}
                  {step !== 'extracting' && step !== 'uploading' && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      {['uploading', 'creating', 'transcribing'].map((s, i) => {
                        const idx = ['uploading', 'creating', 'transcribing'].indexOf(step)
                        const done = i < idx; const active = i === idx
                        return <div key={s} style={{ flex: 1, height: 3, borderRadius: 2, background: done ? V.accent : active ? V.amber : V.border2 }} />
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* ===== BATCH MODE ===== */}
          {mode === 'batch' && (
            <>
              {batchStep === 'extracting' && (
                <div style={{ textAlign: 'center', padding: '32px 0' }}>
                  <div style={{ fontSize: 28, marginBottom: 12 }}>📦</div>
                  <div style={{ fontSize: 13, color: V.text2 }}>Extraindo arquivos do ZIP...</div>
                </div>
              )}

              {batchStep === 'uploading' && (
                <div style={{ padding: '12px 0' }}>
                  <div style={{ fontSize: 13, color: V.text2, marginBottom: 16 }}>
                    Enviando ligação {batchProgress.current} de {batchProgress.total}...
                  </div>
                  <div style={{ height: 3, background: V.border2, borderRadius: 2, marginBottom: 8 }}>
                    <div style={{
                      width: `${Math.round((batchProgress.current / batchProgress.total) * 100)}%`,
                      height: 3, background: V.accent, borderRadius: 2, transition: 'width 0.4s',
                    }} />
                  </div>
                  <div style={{ fontFamily: V.mono, fontSize: 10, color: V.text3 }}>
                    {Math.round((batchProgress.current / batchProgress.total) * 100)}%
                  </div>
                  <div style={{ marginTop: 14, fontSize: 11, color: V.text3 }}>
                    Após o envio, a análise de IA continua em segundo plano.
                  </div>
                </div>
              )}

              {(batchStep === 'form' || batchStep === 'error') && (
                <div>
                  {/* Vendedor + Cliente for batch too */}
                  {SellerClientFields}

                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Arquivo ZIP *</label>
                    <div
                      onDragOver={handleZipDragOver}
                      onDragLeave={handleZipDragLeave}
                      onDrop={handleZipDrop}
                      onClick={() => zipInputRef.current?.click()}
                      style={{
                        border: `2px dashed ${isZipDragging ? V.accent : V.border2}`,
                        borderRadius: 5, padding: '36px 20px', textAlign: 'center',
                        cursor: 'pointer', background: isZipDragging ? V.accentDim : V.surface2,
                        transition: 'border-color 0.15s, background 0.15s',
                      }}
                    >
                      <input ref={zipInputRef} type="file" accept=".zip" style={{ display: 'none' }} onChange={handleZipInputChange} />
                      <div style={{ fontSize: 28, marginBottom: 10 }}>📦</div>
                      <div style={{ fontSize: 13, color: V.text2, marginBottom: 4 }}>Arraste o arquivo .zip ou clique para selecionar</div>
                      <div style={{ fontFamily: V.mono, fontSize: 10, color: V.text3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Máx. 10 ligações analisadas</div>
                    </div>
                  </div>

                  {batchError && (
                    <div style={{ marginBottom: 14, padding: '8px 12px', borderRadius: 4, background: 'rgba(255,68,85,0.08)', border: '1px solid rgba(255,68,85,0.2)', fontSize: 12, color: '#FF4455' }}>
                      {batchError}
                    </div>
                  )}

                  <button onClick={onClose} style={{
                    width: '100%', padding: '9px', borderRadius: 4,
                    border: `1px solid ${V.border2}`, background: V.surface2,
                    color: V.text2, fontSize: 13, fontFamily: V.ui, fontWeight: 600, cursor: 'pointer',
                  }}>Cancelar</button>
                </div>
              )}

              {batchStep === 'preview' && (
                <div>
                  {/* Vendedor + Cliente */}
                  {SellerClientFields}

                  <div style={{ marginBottom: 14 }}>
                    <label style={labelStyle}>Nome do Pack *</label>
                    <input type="text" value={batchName} onChange={e => setBatchName(e.target.value)} style={inpStyle} autoFocus />
                  </div>

                  {/* Period of reference */}
                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>Período de referência</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      <div>
                        <label style={{ ...labelStyle, fontSize: 8, marginBottom: 4 }}>De</label>
                        <input
                          type="date"
                          value={batchPeriodoInicio}
                          onChange={e => setBatchPeriodoInicio(e.target.value)}
                          style={{ ...inpStyle, colorScheme: 'dark' as React.CSSProperties['colorScheme'] }}
                        />
                      </div>
                      <div>
                        <label style={{ ...labelStyle, fontSize: 8, marginBottom: 4 }}>Até</label>
                        <input
                          type="date"
                          value={batchPeriodoFim}
                          onChange={e => setBatchPeriodoFim(e.target.value)}
                          min={batchPeriodoInicio || undefined}
                          style={{ ...inpStyle, colorScheme: 'dark' as React.CSSProperties['colorScheme'] }}
                        />
                      </div>
                    </div>
                    <div style={{ fontSize: 10, color: V.text3, marginTop: 5, fontFamily: V.mono }}>
                      Opcional — permite filtrar por data e acompanhar evolução ao longo do tempo
                    </div>
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={labelStyle}>
                      {extractedFiles.length} ligaç{extractedFiles.length === 1 ? 'ão' : 'ões'} encontradas
                      {extractedFiles.length === 10 ? ' — as 10 maiores' : ''}
                    </label>
                    <div style={{ background: V.surface2, border: `1px solid ${V.border2}`, borderRadius: 4, overflow: 'hidden' }}>
                      {extractedFiles.map((ef, i) => (
                        <div key={i} style={{
                          display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px',
                          borderBottom: i < extractedFiles.length - 1 ? `1px solid ${V.border}` : 'none',
                        }}>
                          <span style={{ fontSize: 14 }}>🎵</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, color: V.text1, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {ef.name}
                            </div>
                          </div>
                          <div style={{ fontFamily: V.mono, fontSize: 10, color: V.text3, flexShrink: 0 }}>
                            {formatBytes(ef.size)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {batchError && (
                    <div style={{ marginBottom: 14, padding: '8px 12px', borderRadius: 4, background: 'rgba(255,68,85,0.08)', border: '1px solid rgba(255,68,85,0.2)', fontSize: 12, color: '#FF4455' }}>
                      {batchError}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => { setExtractedFiles([]); setBatchPeriodoInicio(''); setBatchPeriodoFim(''); setBatchStep('form') }} style={{
                      flex: 1, padding: '9px', borderRadius: 4,
                      border: `1px solid ${V.border2}`, background: V.surface2,
                      color: V.text2, fontSize: 13, fontFamily: V.ui, fontWeight: 600, cursor: 'pointer',
                    }}>Voltar</button>
                    <button
                      onClick={handleBatchSubmit}
                      disabled={!batchName.trim() || (!isVendorPortal && !vendedorId)}
                      style={{
                        flex: 2, padding: '9px', borderRadius: 4, border: 'none',
                        background: (!batchName.trim() || (!isVendorPortal && !vendedorId)) ? V.text3 : V.accent,
                        color: '#000', fontSize: 13, fontFamily: V.ui, fontWeight: 700,
                        cursor: (!batchName.trim() || (!isVendorPortal && !vendedorId)) ? 'default' : 'pointer',
                      }}
                    >
                      Enviar {extractedFiles.length} ligaç{extractedFiles.length === 1 ? 'ão' : 'ões'} e Analisar
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
