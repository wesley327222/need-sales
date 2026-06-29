-- Garante que ligacoes_lotes tem todas as colunas que o código já espera.
-- Corrige "Could not find the 'arquivo_zip_url' column of 'ligacoes_lotes' in
-- the schema cache" (tabela no banco ao vivo ficou desalinhada da migration 003)
-- e adiciona 'relatorio', usada por /api/lotes/[id]/process e /status mas que
-- nunca tinha sido criada em nenhuma migration.

ALTER TABLE ligacoes_lotes
  ADD COLUMN IF NOT EXISTS arquivo_zip_url text,
  ADD COLUMN IF NOT EXISTS relatorio       jsonb;
