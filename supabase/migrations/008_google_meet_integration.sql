-- Google Meet auto-recording pipeline (Nylas Notetaker)

ALTER TABLE reunioes
  ADD COLUMN IF NOT EXISTS google_event_id   text,
  ADD COLUMN IF NOT EXISTS nylas_notetaker_id text,
  ADD COLUMN IF NOT EXISTS meet_url          text,
  ADD COLUMN IF NOT EXISTS origem            text;

CREATE TABLE IF NOT EXISTS google_calendar_sync (
  id                 text PRIMARY KEY DEFAULT 'default',
  sync_token         text,
  channel_id         text,
  resource_id        text,
  channel_expiration bigint,
  updated_at         timestamptz DEFAULT now()
);

INSERT INTO google_calendar_sync (id) VALUES ('default') ON CONFLICT DO NOTHING;
