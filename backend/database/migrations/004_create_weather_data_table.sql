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
