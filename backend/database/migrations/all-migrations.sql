-- Beat The Heat - Database Migrations
-- Combined script for weather + heat index + AI analysis logging
-- 2026-03-25

-- ============================================
-- MIGRATION 004: Weather Data Table
-- ============================================
create extension if not exists pgcrypto;

create table if not exists public.weather_data (
	id uuid primary key default gen_random_uuid(),
	school_id uuid not null,
	source varchar(32) not null,
	location text not null,
	temperature_c numeric(5,2) not null,
	humidity_percent integer not null,
	condition text not null,
	wind_speed_mps numeric(6,2) not null,
	pressure_hpa numeric(7,2) not null,
	observed_at timestamptz not null,
	created_at timestamptz not null default now(),
	raw_payload jsonb not null
);

create index if not exists idx_weather_data_school_time
	on public.weather_data (school_id, observed_at desc);

-- ============================================
-- MIGRATION 003: Heat Index Logs Table
-- ============================================
create table if not exists public.heat_index_logs (
	id uuid primary key default gen_random_uuid(),
	school_id uuid not null,
	weather_data_id uuid,
	heat_index_c numeric(5,2) not null,
	heat_level varchar(32) not null,
	observed_at timestamptz not null,
	created_at timestamptz not null default now()
);

create index if not exists idx_heat_index_logs_school_time
	on public.heat_index_logs (school_id, observed_at desc);

-- ============================================
-- MIGRATION 007: AI Analysis Logs Table
-- ============================================
create table if not exists public.ai_analysis_logs (
	id uuid primary key default gen_random_uuid(),
	school_id uuid not null,
	model varchar(128) not null,
	source varchar(32) not null,
	request_query text not null,
	weather_snapshot jsonb not null,
	ai_response text not null,
	tokens_input integer,
	tokens_output integer,
	tokens_total integer,
	estimated_cost_usd numeric(12,6),
	created_at timestamptz not null default now()
);

create index if not exists idx_ai_analysis_logs_school_time
	on public.ai_analysis_logs (school_id, created_at desc);

-- ============================================
-- RLS POLICIES: Row Level Security
-- ============================================

-- Enable RLS on all tables
alter table public.weather_data enable row level security;
alter table public.heat_index_logs enable row level security;
alter table public.ai_analysis_logs enable row level security;

-- WEATHER_DATA Policies
create policy "weather_data_select_by_school"
on public.weather_data for select
using (true); -- Allow public read during development

create policy "weather_data_insert_service"
on public.weather_data for insert
with check (true);

create policy "weather_data_update_service"
on public.weather_data for update
with check (true);

-- HEAT_INDEX_LOGS Policies
create policy "heat_index_logs_select_by_school"
on public.heat_index_logs for select
using (true);

create policy "heat_index_logs_insert_service"
on public.heat_index_logs for insert
with check (true);

create policy "heat_index_logs_update_service"
on public.heat_index_logs for update
with check (true);

-- AI_ANALYSIS_LOGS Policies
create policy "ai_analysis_logs_select_by_school"
on public.ai_analysis_logs for select
using (true);

create policy "ai_analysis_logs_insert_service"
on public.ai_analysis_logs for insert
with check (true);

create policy "ai_analysis_logs_update_service"
on public.ai_analysis_logs for update
with check (true);
