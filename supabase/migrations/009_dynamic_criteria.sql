-- Dynamic, manager-configurable AI scoring criteria (mandatory + up to 4 optional per tipo)

ALTER TABLE ai_config
  ADD COLUMN IF NOT EXISTS qualificacao_lead_prompt text;

ALTER TABLE reunioes
  ADD COLUMN IF NOT EXISTS nota_1 numeric,
  ADD COLUMN IF NOT EXISTS nota_2 numeric,
  ADD COLUMN IF NOT EXISTS nota_3 numeric,
  ADD COLUMN IF NOT EXISTS nota_4 numeric,
  ADD COLUMN IF NOT EXISTS criterios_resultado jsonb;

ALTER TABLE ligacoes
  ADD COLUMN IF NOT EXISTS nota_1 numeric,
  ADD COLUMN IF NOT EXISTS nota_2 numeric,
  ADD COLUMN IF NOT EXISTS nota_3 numeric,
  ADD COLUMN IF NOT EXISTS nota_4 numeric,
  ADD COLUMN IF NOT EXISTS criterios_resultado jsonb;
