-- A tabela ligacoes_lotes ao vivo está revelando colunas faltantes uma por vez
-- ("Could not find column X in the schema cache"). Em vez de corrigir uma a
-- uma, garante de uma vez todas as colunas que a migration 003 original e o
-- código (src/lib/types/database.ts, src/app/api/lotes/**) já esperam.

ALTER TABLE ligacoes_lotes
  ADD COLUMN IF NOT EXISTS vendedor_id          uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS nome                 text,
  ADD COLUMN IF NOT EXISTS status               text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS total_ligacoes       integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ligacoes_processadas integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS arquivo_zip_url      text,
  ADD COLUMN IF NOT EXISTS relatorio            jsonb,
  ADD COLUMN IF NOT EXISTS periodo_inicio       date,
  ADD COLUMN IF NOT EXISTS periodo_fim          date,
  ADD COLUMN IF NOT EXISTS created_at           timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at           timestamptz DEFAULT now();
