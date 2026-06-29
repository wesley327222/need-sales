-- A tabela `ligacoes` foi criada originalmente (003_real_schema.sql) com
-- `data_ligacao`/`duracao_segundos`, mas o código atual (src/app/api/meetings,
-- src/lib/types/database.ts) usa `data_hora`/`duracao` — nomes que nunca foram
-- adicionados em nenhuma migration seguinte. Isso fazia toda criação de
-- ligação (avulsa ou em lote) falhar silenciosamente com
-- "Could not find the 'data_hora' column of 'ligacoes' in the schema cache".
--
-- Garante de uma vez todas as colunas que o código espera, em vez de
-- descobrir uma por vez.

ALTER TABLE ligacoes
  ADD COLUMN IF NOT EXISTS vendedor_id            uuid REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cliente_id             uuid REFERENCES clientes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lote_id                uuid REFERENCES ligacoes_lotes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS status                 text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS audio_url              text,
  ADD COLUMN IF NOT EXISTS audio_filename         text,
  ADD COLUMN IF NOT EXISTS duracao                integer,
  ADD COLUMN IF NOT EXISTS transcricao            text,
  ADD COLUMN IF NOT EXISTS transcricao_formatada  text,
  ADD COLUMN IF NOT EXISTS gladia_request_id      text,
  ADD COLUMN IF NOT EXISTS data_hora              timestamptz,
  ADD COLUMN IF NOT EXISTS nota_acesso_decisor     numeric(4,2),
  ADD COLUMN IF NOT EXISTS nota_qualificacao_lead  numeric(4,2),
  ADD COLUMN IF NOT EXISTS nota_geracao_curiosidade numeric(4,2),
  ADD COLUMN IF NOT EXISTS nota_conducao_conversa  numeric(4,2),
  ADD COLUMN IF NOT EXISTS nota_pedido_reuniao     numeric(4,2),
  ADD COLUMN IF NOT EXISTS nota_geral              numeric(4,2),
  ADD COLUMN IF NOT EXISTS analise                 jsonb,
  ADD COLUMN IF NOT EXISTS insights                jsonb,
  ADD COLUMN IF NOT EXISTS objecoes                jsonb,
  ADD COLUMN IF NOT EXISTS follow_whatsapp_d1      text,
  ADD COLUMN IF NOT EXISTS follow_whatsapp_d3      text,
  ADD COLUMN IF NOT EXISTS follow_email_5          text,
  ADD COLUMN IF NOT EXISTS nota_1                  numeric,
  ADD COLUMN IF NOT EXISTS nota_2                  numeric,
  ADD COLUMN IF NOT EXISTS nota_3                  numeric,
  ADD COLUMN IF NOT EXISTS nota_4                  numeric,
  ADD COLUMN IF NOT EXISTS criterios_resultado     jsonb,
  ADD COLUMN IF NOT EXISTS created_at              timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at              timestamptz DEFAULT now();

-- Se a tabela ainda tiver as colunas antigas com dados, migra o conteúdo
-- para as colunas novas antes de seguir (idempotente — só copia onde o
-- destino está vazio e a origem existe).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ligacoes' AND column_name = 'data_ligacao') THEN
    UPDATE ligacoes SET data_hora = data_ligacao WHERE data_hora IS NULL AND data_ligacao IS NOT NULL;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'ligacoes' AND column_name = 'duracao_segundos') THEN
    UPDATE ligacoes SET duracao = duracao_segundos WHERE duracao IS NULL AND duracao_segundos IS NOT NULL;
  END IF;
END $$;
