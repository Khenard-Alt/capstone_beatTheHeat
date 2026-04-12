create extension if not exists pgcrypto;

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
