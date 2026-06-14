-- Habilitar extensions
create extension if not exists "uuid-ossp";

-- COMPANIES
create table companies (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  description text,
  products text,
  complement text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- USERS (estende auth.users do Supabase)
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid references companies(id) on delete cascade,
  name text not null,
  email text not null,
  role text not null default 'seller' check (role in ('admin', 'manager', 'seller')),
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- MEETINGS (reuniões e ligações)
create table meetings (
  id uuid primary key default uuid_generate_v4(),
  company_id uuid references companies(id) on delete cascade not null,
  seller_id uuid references users(id) on delete set null,
  title text not null,
  type text not null default 'meeting' check (type in ('meeting', 'call')),
  status text not null default 'pending' check (status in ('pending', 'transcribing', 'processing', 'done', 'partial', 'error')),
  audio_url text,
  audio_filename text,
  duration_seconds integer,
  transcription text,
  transcription_formatted text,
  gladia_request_id text,
  scheduled_at timestamptz,
  client_name text,
  overall_score numeric(4,2),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ANALYSES (resultados dos agentes)
create table analyses (
  id uuid primary key default uuid_generate_v4(),
  meeting_id uuid references meetings(id) on delete cascade not null,
  agent_type text not null check (agent_type in ('evaluator', 'spin', 'followups', 'bant', 'report')),
  result jsonb not null default '{}',
  overall_score numeric(4,2),
  status text not null default 'pending' check (status in ('pending', 'processing', 'done', 'error')),
  error_message text,
  retries integer default 0,
  processed_at timestamptz,
  created_at timestamptz default now()
);

-- OBJECTIONS (objeções extraídas)
create table objections (
  id uuid primary key default uuid_generate_v4(),
  meeting_id uuid references meetings(id) on delete cascade not null,
  number integer not null,
  text text not null,
  status text not null check (status in ('quebrada', 'parcial', 'nao_quebrada')),
  how_treated text,
  break_suggestion text,
  created_at timestamptz default now()
);

-- FOLLOWUPS (follow-ups gerados)
create table followups (
  id uuid primary key default uuid_generate_v4(),
  meeting_id uuid references meetings(id) on delete cascade not null,
  channel text not null check (channel in ('whatsapp', 'email')),
  timing text not null,
  subject text,
  message text not null,
  created_at timestamptz default now()
);

-- TRIGGERS para updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_companies_updated_at before update on companies for each row execute function update_updated_at();
create trigger update_users_updated_at before update on users for each row execute function update_updated_at();
create trigger update_meetings_updated_at before update on meetings for each row execute function update_updated_at();

-- ROW LEVEL SECURITY
alter table companies enable row level security;
alter table users enable row level security;
alter table meetings enable row level security;
alter table analyses enable row level security;
alter table objections enable row level security;
alter table followups enable row level security;

-- Policies: usuário só acessa dados da própria empresa
create policy "users_own_company" on users for all using (
  company_id = (select company_id from users where id = auth.uid())
);
create policy "meetings_own_company" on meetings for all using (
  company_id = (select company_id from users where id = auth.uid())
);
create policy "analyses_own_company" on analyses for all using (
  meeting_id in (select id from meetings where company_id = (select company_id from users where id = auth.uid()))
);
create policy "objections_own_company" on objections for all using (
  meeting_id in (select id from meetings where company_id = (select company_id from users where id = auth.uid()))
);
create policy "followups_own_company" on followups for all using (
  meeting_id in (select id from meetings where company_id = (select company_id from users where id = auth.uid()))
);
