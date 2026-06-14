-- =============================================================================
-- Schema real do Need Sales
-- Substitui o schema antigo (users/meetings/analyses) pelo real
-- =============================================================================

-- Extensões
create extension if not exists "uuid-ossp";

-- =============================================================================
-- COMPANIES
-- =============================================================================
create table if not exists companies (
  id          uuid primary key default uuid_generate_v4(),
  nome        text not null,
  cnpj        text,
  descricao   text,
  "Produtos"  text,
  "Complemento" text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- =============================================================================
-- PROFILES (estende auth.users)
-- =============================================================================
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  empresa_id  uuid references companies(id) on delete cascade,
  nome        text not null,
  email       text not null,
  role        text not null default 'seller' check (role in ('admin', 'manager', 'seller')),
  avatar_url  text,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- =============================================================================
-- CLIENTES
-- =============================================================================
create table if not exists clientes (
  id          uuid primary key default uuid_generate_v4(),
  empresa_id  uuid references companies(id) on delete cascade not null,
  nome        text not null,
  email       text,
  telefone    text,
  created_at  timestamptz default now()
);

-- =============================================================================
-- REUNIOES (reuniões de vendas)
-- =============================================================================
create table if not exists reunioes (
  id                    uuid primary key default uuid_generate_v4(),
  empresa_id            uuid references companies(id) on delete cascade not null,
  vendedor_id           uuid references profiles(id) on delete set null,
  cliente_id            uuid references clientes(id) on delete set null,
  titulo                text not null,
  status                text not null default 'pending'
                          check (status in ('pending','transcribing','processing','done','partial','error')),
  audio_url             text,
  audio_filename        text,
  duracao_segundos      integer,
  transcricao           text,
  transcricao_formatada text,
  gladia_request_id     text,
  data_reuniao          timestamptz,
  -- Scores inline
  nota_escuta           numeric(4,2),
  nota_objecoes         numeric(4,2),
  nota_apresentacao     numeric(4,2),
  nota_geral            numeric(4,2),
  -- AI results inline
  analise               jsonb,   -- SPIN result
  insights              jsonb,   -- string[]
  objecoes              jsonb,   -- ObjecaoAvaliada[]
  -- Follow-ups inline
  follow_whatsapp_d1    text,
  follow_whatsapp_d3    text,
  follow_email_5        text,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

-- =============================================================================
-- LIGACOES_LOTES (lotes de cold calls enviados em ZIP)
-- =============================================================================
create table if not exists ligacoes_lotes (
  id                   uuid primary key default uuid_generate_v4(),
  empresa_id           uuid references companies(id) on delete cascade not null,
  vendedor_id          uuid references profiles(id) on delete set null,
  nome                 text not null,
  arquivo_zip_url      text,
  status               text not null default 'pending'
                         check (status in ('pending','processing','done','error')),
  total_ligacoes       integer default 0,
  ligacoes_processadas integer default 0,
  created_at           timestamptz default now(),
  updated_at           timestamptz default now()
);

-- =============================================================================
-- LIGACOES (cold calls / prospecção)
-- =============================================================================
create table if not exists ligacoes (
  id                    uuid primary key default uuid_generate_v4(),
  empresa_id            uuid references companies(id) on delete cascade not null,
  vendedor_id           uuid references profiles(id) on delete set null,
  cliente_id            uuid references clientes(id) on delete set null,
  lote_id               uuid references ligacoes_lotes(id) on delete set null,
  titulo                text not null,
  status                text not null default 'pending'
                          check (status in ('pending','transcribing','processing','done','partial','error')),
  audio_url             text,
  audio_filename        text,
  duracao_segundos      integer,
  transcricao           text,
  transcricao_formatada text,
  gladia_request_id     text,
  data_ligacao          timestamptz,
  -- Scores inline (5 critérios de cold call)
  nota_acesso_decisor      numeric(4,2),
  nota_qualificacao_lead   numeric(4,2),
  nota_geracao_curiosidade numeric(4,2),
  nota_conducao_conversa   numeric(4,2),
  nota_pedido_reuniao      numeric(4,2),
  nota_geral               numeric(4,2),
  -- AI results inline
  analise               jsonb,   -- LigacaoResult
  insights              jsonb,   -- string[]
  objecoes              jsonb,   -- ObjecaoAvaliada[]
  -- Follow-ups inline
  follow_whatsapp_d1    text,
  follow_whatsapp_d3    text,
  follow_email_5        text,
  created_at            timestamptz default now(),
  updated_at            timestamptz default now()
);

-- =============================================================================
-- TRIGGERS para updated_at
-- =============================================================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_companies_updated_at    before update on companies    for each row execute function update_updated_at();
create trigger trg_profiles_updated_at     before update on profiles     for each row execute function update_updated_at();
create trigger trg_reunioes_updated_at     before update on reunioes     for each row execute function update_updated_at();
create trigger trg_ligacoes_updated_at     before update on ligacoes     for each row execute function update_updated_at();
create trigger trg_lotes_updated_at        before update on ligacoes_lotes for each row execute function update_updated_at();

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
alter table companies      enable row level security;
alter table profiles       enable row level security;
alter table clientes       enable row level security;
alter table reunioes       enable row level security;
alter table ligacoes       enable row level security;
alter table ligacoes_lotes enable row level security;

-- Helper: empresa do usuário logado
create or replace function my_empresa_id()
returns uuid language sql stable as $$
  select empresa_id from profiles where id = auth.uid()
$$;

-- Policies
create policy "profiles_own"    on profiles    for all using (empresa_id = my_empresa_id());
create policy "clientes_own"    on clientes    for all using (empresa_id = my_empresa_id());
create policy "reunioes_own"    on reunioes    for all using (empresa_id = my_empresa_id());
create policy "ligacoes_own"    on ligacoes    for all using (empresa_id = my_empresa_id());
create policy "lotes_own"       on ligacoes_lotes for all using (empresa_id = my_empresa_id());
create policy "companies_own"   on companies   for all using (id = my_empresa_id());

-- =============================================================================
-- Realtime
-- =============================================================================
alter publication supabase_realtime add table reunioes;
alter publication supabase_realtime add table ligacoes;

-- =============================================================================
-- TRIGGER: criar profile automaticamente ao registrar usuário
-- =============================================================================
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, email, nome)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nome', split_part(new.email, '@', 1))
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
