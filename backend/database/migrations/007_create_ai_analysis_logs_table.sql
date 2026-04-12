create extension if not exists pgcrypto;

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
