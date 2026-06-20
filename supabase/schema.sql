-- ===========================================================================
-- Beso Client Hunter — Supabase / Postgres schema
-- ===========================================================================
-- Run this in the Supabase SQL editor (or `supabase db push`) to provision the
-- six core tables. Safe to re-run: it drops & recreates everything.
--
-- This is a single-operator internal tool. All access goes through the server
-- using the service role key (which bypasses RLS), so RLS is enabled with no
-- permissive policies — the anon/public key cannot read or write anything.
-- ===========================================================================

-- Extensions ---------------------------------------------------------------
create extension if not exists "pgcrypto";

-- Enums --------------------------------------------------------------------
do $$ begin
  create type lead_status as enum
    ('new','ready','approved','contacted','replied','not_interested','potential_client','won');
exception when duplicate_object then null; end $$;

-- If upgrading an existing DB (instead of fresh install), run:
-- alter type lead_status add value if not exists 'approved';
-- alter type lead_status add value if not exists 'replied';
-- alter type lead_status add value if not exists 'not_interested';
-- alter type lead_status add value if not exists 'potential_client';
-- then remove 'analyzed', 'lost', 'archived' (requires recreating the column).

do $$ begin
  create type lead_source as enum ('manual','agent','demo','google_places','csv');
exception when duplicate_object then null; end $$;

do $$ begin
  create type website_status as enum
    ('none','social_only','outdated','broken','ok','unknown');
exception when duplicate_object then null; end $$;

do $$ begin
  create type confidence_level as enum ('low','medium','high');
exception when duplicate_object then null; end $$;

do $$ begin
  create type message_type as enum ('outreach','follow_up');
exception when duplicate_object then null; end $$;

do $$ begin
  create type message_language as enum ('ka','en','ru');
exception when duplicate_object then null; end $$;

do $$ begin
  create type contact_channel as enum
    ('phone','email','instagram','facebook','in_person','other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type contact_outcome as enum
    ('no_answer','interested','not_interested','callback','meeting','other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type agent_run_status as enum ('running','completed','failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type outreach_tone as enum ('friendly','warm','professional','direct');
exception when duplicate_object then null; end $$;

-- updated_at helper --------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- 1. leads -----------------------------------------------------------------
drop table if exists contact_attempts cascade;
drop table if exists generated_messages cascade;
drop table if exists lead_analyses cascade;
drop table if exists leads cascade;
drop table if exists agent_runs cascade;
drop table if exists settings cascade;

create table leads (
  id            uuid primary key default gen_random_uuid(),
  business_name text not null,
  category      text,
  city          text,
  website_url   text,
  instagram_url text,
  facebook_url  text,
  phone         text,
  email         text,
  source        lead_source not null default 'manual',
  status        lead_status not null default 'new',
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Used by the agent's dedup step.
create unique index leads_name_city_uniq
  on leads (lower(business_name), lower(coalesce(city, '')));
create index leads_status_idx on leads (status);
create index leads_city_idx on leads (lower(coalesce(city, '')));
create index leads_category_idx on leads (lower(coalesce(category, '')));

create trigger leads_set_updated_at
  before update on leads
  for each row execute function set_updated_at();

-- 2. lead_analyses ---------------------------------------------------------
create table lead_analyses (
  id                        uuid primary key default gen_random_uuid(),
  lead_id                   uuid not null references leads(id) on delete cascade,
  website_status            website_status not null default 'unknown',
  problems_found            jsonb not null default '[]'::jsonb,
  business_strengths        jsonb not null default '[]'::jsonb,
  why_they_need_website     text not null default '',
  lead_score                int not null default 0 check (lead_score between 0 and 100),
  suggested_price_range_gel text not null default '',
  best_outreach_angle       text not null default '',
  confidence                confidence_level not null default 'medium',
  created_at                timestamptz not null default now()
);

-- One current analysis per lead (re-analysis replaces it).
create unique index lead_analyses_lead_uniq on lead_analyses (lead_id);
create index lead_analyses_score_idx on lead_analyses (lead_score desc);

-- 3. generated_messages ----------------------------------------------------
create table generated_messages (
  id           uuid primary key default gen_random_uuid(),
  lead_id      uuid not null references leads(id) on delete cascade,
  message_type message_type not null default 'outreach',
  language     message_language not null default 'ka',
  body         text not null,
  approved     boolean not null default false,
  created_at   timestamptz not null default now()
);

create index generated_messages_lead_idx on generated_messages (lead_id);

-- 4. contact_attempts ------------------------------------------------------
-- Logged MANUALLY by Beso. The agent never sends anything.
create table contact_attempts (
  id         uuid primary key default gen_random_uuid(),
  lead_id    uuid not null references leads(id) on delete cascade,
  channel    contact_channel not null,
  outcome    contact_outcome,
  note       text,
  created_at timestamptz not null default now()
);

create index contact_attempts_lead_idx on contact_attempts (lead_id);

-- 5. agent_runs ------------------------------------------------------------
create table agent_runs (
  id                 uuid primary key default gen_random_uuid(),
  status             agent_run_status not null default 'running',
  city               text,
  category           text,
  max_results        int not null default 10,
  total_found        int not null default 0,
  saved              int not null default 0,
  skipped_duplicates int not null default 0,
  high_value_leads   int not null default 0,
  errors             jsonb not null default '[]'::jsonb,
  summary            text,
  started_at         timestamptz not null default now(),
  finished_at        timestamptz
);

create index agent_runs_started_idx on agent_runs (started_at desc);

-- 6. settings (single row) -------------------------------------------------
create table settings (
  id                    uuid primary key,
  my_name               text not null default '',
  service_description    text not null default '',
  preferred_cities      jsonb not null default '[]'::jsonb,
  preferred_categories  jsonb not null default '[]'::jsonb,
  default_price_min_gel int not null default 800,
  default_price_max_gel int not null default 2500,
  tone                  outreach_tone not null default 'friendly',
  default_language      message_language not null default 'ka',
  signature             text not null default '',
  contact_phone         text,
  contact_email         text,
  updated_at            timestamptz not null default now()
);

create trigger settings_set_updated_at
  before update on settings
  for each row execute function set_updated_at();

-- Row Level Security -------------------------------------------------------
-- Enabled with no policies => only the service role (server) can touch data.
alter table leads enable row level security;
alter table lead_analyses enable row level security;
alter table generated_messages enable row level security;
alter table contact_attempts enable row level security;
alter table agent_runs enable row level security;
alter table settings enable row level security;
