-- AI configuration per company and type (reuniao / ligacao)
CREATE TABLE IF NOT EXISTS ai_config (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id  uuid REFERENCES companies(id) ON DELETE CASCADE NOT NULL,
  tipo        text NOT NULL CHECK (tipo IN ('reuniao', 'ligacao')),
  criterios   jsonb NOT NULL DEFAULT '{}',
  conhecimentos text,
  updated_at  timestamptz DEFAULT now(),
  UNIQUE(empresa_id, tipo)
);

ALTER TABLE ai_config ENABLE ROW LEVEL SECURITY;

-- Service role has full access (API uses service client)
CREATE POLICY "service_all" ON ai_config
  FOR ALL TO service_role USING (true) WITH CHECK (true);
