-- cliente_id should be optional: meetings/calls can exist without a linked client
ALTER TABLE reunioes ALTER COLUMN cliente_id DROP NOT NULL;
ALTER TABLE ligacoes ALTER COLUMN cliente_id DROP NOT NULL;
