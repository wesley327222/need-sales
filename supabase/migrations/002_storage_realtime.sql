-- =============================================================================
-- Storage bucket: audio-files
-- =============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'audio-files',
  'audio-files',
  false,
  524288000, -- 500 MB
  ARRAY[
    'audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/x-m4a',
    'audio/ogg', 'audio/webm', 'video/mp4'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- RLS: usuário autenticado pode fazer upload
CREATE POLICY "Authenticated users can upload audio"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'audio-files');

-- RLS: usuário autenticado pode ler (para URLs assinadas server-side)
CREATE POLICY "Authenticated users can read audio"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'audio-files');

-- RLS: usuário autenticado pode deletar seus próprios arquivos
CREATE POLICY "Authenticated users can delete audio"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'audio-files');

-- =============================================================================
-- Supabase Realtime: habilitar nas tabelas de meetings e analyses
-- =============================================================================
ALTER PUBLICATION supabase_realtime ADD TABLE meetings;
ALTER PUBLICATION supabase_realtime ADD TABLE analyses;
