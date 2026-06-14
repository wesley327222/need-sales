-- Add evaluation period to batch lots
ALTER TABLE ligacoes_lotes
  ADD COLUMN IF NOT EXISTS periodo_inicio date,
  ADD COLUMN IF NOT EXISTS periodo_fim    date;
