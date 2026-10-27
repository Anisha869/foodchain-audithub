create schema if not exists extensions;
create extension if not exists vector with schema extensions;

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  code text not null unique,
  contact_person text not null,
  email text not null,
  phone text,
  address text,
  industry_category text not null default 'Food Processing & Logistics',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role text not null check (role in ('admin', 'planner', 'auditor', 'reviewer', 'customer')),
  phone text,
  customer_id uuid references public.customers(id) on delete set null,
  specialization text not null default '',
  certifications text[] not null default '{}',
  experience_years integer not null default 0,
  qualification text not null default '',
  auditor_id_code text not null default '',
  address text not null default '',
  bio text not null default '',
  is_active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.sites (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  site_name text not null,
  site_code text not null,
  address text not null,
  city text,
  state text,
  contact_person text,
  contact_phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (customer_id, site_code)
);

create table if not exists public.checklists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  standard text not null default 'FSSAI',
  description text not null default '',
  items jsonb not null default '[]'::jsonb,
  customer_id uuid references public.customers(id) on delete set null,
  uploaded_by uuid references public.profiles(id) on delete set null,
  file_name text,
  file_size bigint,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.audits (
  id uuid primary key default gen_random_uuid(),
  audit_ref text not null unique,
  customer_id uuid not null references public.customers(id) on delete restrict,
  site_id uuid not null references public.sites(id) on delete restrict,
  auditor_id uuid references public.profiles(id) on delete set null,
  reviewer_id uuid references public.profiles(id) on delete set null,
  standard text not null default 'FSSAI',
  scheduled_date timestamptz not null,
  completed_date timestamptz,
  status text not null default 'SCHEDULED'
    check (status in ('SCHEDULED', 'IN_PROGRESS', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CANCELLED')),
  score numeric(5, 2) check (score is null or (score >= 0 and score <= 100)),
  checklist_id uuid references public.checklists(id) on delete set null,
  answers jsonb not null default '[]'::jsonb,
  reviewer_comments text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_knowledge_chunks (
  id uuid primary key default gen_random_uuid(),
  source_type text not null,
  source_id uuid,
  standard text not null default 'FSSAI',
  content text not null,
  metadata jsonb not null default '{}'::jsonb,
  embedding extensions.vector(384) not null,
  created_at timestamptz not null default now()
);

create index if not exists audits_customer_status_idx on public.audits(customer_id, status);
create index if not exists audits_auditor_idx on public.audits(auditor_id);
create index if not exists audits_scheduled_date_idx on public.audits(scheduled_date desc);
create index if not exists sites_customer_id_idx on public.sites(customer_id);
create index if not exists checklists_customer_id_idx on public.checklists(customer_id);
create index if not exists ai_knowledge_standard_idx on public.ai_knowledge_chunks(standard);
create index if not exists ai_knowledge_embedding_idx
  on public.ai_knowledge_chunks using hnsw (embedding extensions.vector_cosine_ops);

create or replace function public.match_ai_knowledge(
  query_embedding extensions.vector(384),
  match_count integer default 5,
  filter_standard text default null,
  filter_customer_id uuid default null
)
returns table (
  id uuid,
  source_type text,
  source_id uuid,
  standard text,
  content text,
  metadata jsonb,
  similarity double precision
)
language sql
stable
set search_path = public, extensions
as $$
  select
    chunks.id,
    chunks.source_type,
    chunks.source_id,
    chunks.standard,
    chunks.content,
    chunks.metadata,
    1 - (chunks.embedding <=> query_embedding) as similarity
  from public.ai_knowledge_chunks as chunks
  where (filter_standard is null or lower(chunks.standard) = lower(filter_standard))
    and (
      filter_customer_id is null
      or chunks.source_id in (
        select id from public.checklists
        where customer_id = filter_customer_id or customer_id is null
      )
    )
  order by chunks.embedding <=> query_embedding
  limit greatest(1, least(match_count, 10));
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at before update on public.customers
  for each row execute function public.set_updated_at();
drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
drop trigger if exists sites_set_updated_at on public.sites;
create trigger sites_set_updated_at before update on public.sites
  for each row execute function public.set_updated_at();
drop trigger if exists checklists_set_updated_at on public.checklists;
create trigger checklists_set_updated_at before update on public.checklists
  for each row execute function public.set_updated_at();
drop trigger if exists audits_set_updated_at on public.audits;
create trigger audits_set_updated_at before update on public.audits
  for each row execute function public.set_updated_at();

alter table public.customers enable row level security;
alter table public.profiles enable row level security;
alter table public.sites enable row level security;
alter table public.checklists enable row level security;
alter table public.audits enable row level security;
alter table public.ai_knowledge_chunks enable row level security;

grant all on public.customers, public.profiles, public.sites, public.checklists, public.audits, public.ai_knowledge_chunks to service_role;
grant select on public.profiles to authenticated;

drop policy if exists "Users can read their own profile" on public.profiles;
create policy "Users can read their own profile"
  on public.profiles for select to authenticated
  using (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

revoke update on public.profiles from authenticated;
grant update (name, phone, specialization, certifications, experience_years, qualification, auditor_id_code, address, bio)
  on public.profiles to authenticated;

revoke all on function public.match_ai_knowledge(extensions.vector, integer, text, uuid) from public, anon, authenticated;
grant execute on function public.match_ai_knowledge(extensions.vector, integer, text, uuid) to service_role;
