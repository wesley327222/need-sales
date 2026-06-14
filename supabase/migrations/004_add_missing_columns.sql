-- Add columns that may be missing from reunioes if the table was created
-- before these fields were added to 003_real_schema.sql

ALTER TABLE reunioes ADD COLUMN IF NOT EXISTS audio_filename text;
ALTER TABLE reunioes ADD COLUMN IF NOT EXISTS audio_url      text;
ALTER TABLE reunioes ADD COLUMN IF NOT EXISTS data_hora      timestamptz;
ALTER TABLE reunioes ADD COLUMN IF NOT EXISTS duracao        integer;

-- data_hora is optional in the upload form — drop NOT NULL if it exists
ALTER TABLE reunioes ALTER COLUMN data_hora DROP NOT NULL;

-- Expand status check to include both English values (used by code) and
-- legacy Portuguese values that may exist in older rows
ALTER TABLE reunioes DROP CONSTRAINT IF EXISTS reunioes_status_check;
ALTER TABLE reunioes ADD CONSTRAINT reunioes_status_check
  CHECK (status IN ('pending','transcribing','processing','done','partial','error','processando','processado','erro'));
