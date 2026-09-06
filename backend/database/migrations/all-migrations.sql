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

-- ============================================
-- MIGRATION 009: Identity and Student Tables
-- ============================================

create extension if not exists pgcrypto;

create table if not exists public.schools (
	id text primary key default 'school-1',
	name text not null,
	address text,
	contact text,
	email text,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

insert into public.schools (id, name, address, contact, email)
values (
	'school-1',
	'Mayamot Elementary School',
	'Mayamot, Antipolo City, Rizal',
	'+63 (02) 8234-5678',
	'mayamot.es@deped.gov.ph'
)
on conflict (id) do update set
	name = excluded.name,
	address = excluded.address,
	contact = excluded.contact,
	email = excluded.email,
	updated_at = now();

create table if not exists public.users (
	id uuid primary key default gen_random_uuid(),
	email text not null unique,
	password_hash text not null,
	first_name text not null,
	last_name text not null,
	role text not null check (role in ('admin', 'principal', 'head-teacher', 'teacher', 'staff', 'parent')),
	phone text,
	school_id text not null default 'school-1' references public.schools(id) on delete restrict,
	metadata jsonb not null default '{}'::jsonb,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index if not exists idx_users_school_role
	on public.users (school_id, role);

create index if not exists idx_users_email
	on public.users (email);

create table if not exists public.admin_auth (
	id uuid primary key default gen_random_uuid(),
	admin_user_id uuid not null references public.users(id) on delete cascade,
	auth_label text not null default 'primary',
	secret_hash text not null,
	is_active boolean not null default true,
	last_used_at timestamptz,
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now(),
	unique (admin_user_id, auth_label)
);

create index if not exists idx_admin_auth_admin
	on public.admin_auth (admin_user_id, is_active);

create table if not exists public.students (
	id text primary key,
	student_number text unique,
	first_name text not null,
	last_name text not null,
	grade_level text,
	section text,
	parent_user_id uuid references public.users(id) on delete set null,
	school_id text not null default 'school-1' references public.schools(id) on delete restrict,
	status text not null default 'active' check (status in ('active', 'inactive', 'transferred', 'graduated')),
	created_at timestamptz not null default now(),
	updated_at timestamptz not null default now()
);

create index if not exists idx_students_school_grade
	on public.students (school_id, grade_level);

create index if not exists idx_students_parent
	on public.students (parent_user_id);

insert into public.students (id, student_number, first_name, last_name, grade_level, section, school_id, status)
values
	('s1', '2026-0001', 'Juan', 'Dela Cruz', 'Grade 3', 'A', 'school-1', 'active'),
	('s2', '2026-0002', 'Maria', 'Santos', 'Grade 5', 'B', 'school-1', 'active'),
	('s3', '2026-0003', 'Carlos', 'Reyes', 'Grade 4', 'C', 'school-1', 'active')
on conflict (id) do update set
	student_number = excluded.student_number,
	first_name = excluded.first_name,
	last_name = excluded.last_name,
	grade_level = excluded.grade_level,
	section = excluded.section,
	school_id = excluded.school_id,
	status = excluded.status,
	updated_at = now();

create table if not exists public.parent_student_guardians (
	parent_user_id uuid not null references public.users(id) on delete cascade,
	student_id text not null references public.students(id) on delete cascade,
	relationship_type text not null default 'parent' check (relationship_type in ('parent', 'legal-guardian', 'guardian', 'other')),
	is_primary boolean not null default false,
	created_at timestamptz not null default now(),
	primary key (parent_user_id, student_id)
);

-- Seed users and admin-auth baseline
insert into public.users (email, password_hash, first_name, last_name, role, phone, school_id, metadata)
values
	('admin@beattheheat.local', '$2b$10$sbjgoAiiMij60xhnlGmjSO5t8jJomulvQCdAvF3HEkq2qmI9j17KS', 'System', 'Administrator', 'admin', '+63 912 000 0001', 'school-1', '{"seeded": true}'::jsonb),
	('parent@beattheheat.local', '$2b$10$hzqmbAY8YFlKYKJc8y4mJ.a7G0pdQ5sLRNluYR0nSsuNj6uyeckCK', 'Maria', 'Parent', 'parent', '+63 912 000 0002', 'school-1', '{"seeded": true}'::jsonb),
	('teacher@beattheheat.local', '$2b$10$51n6u285G7vKzITbmW4Avu0nMO6nOoeTy0FpjLcjY7Aa5c/nRg3l6', 'Tomas', 'Teacher', 'teacher', '+63 912 000 0003', 'school-1', '{"seeded": true}'::jsonb),
	('principal@beattheheat.local', '$2b$10$51n6u285G7vKzITbmW4Avu0nMO6nOoeTy0FpjLcjY7Aa5c/nRg3l6', 'Paula', 'Principal', 'principal', '+63 912 000 0004', 'school-1', '{"seeded": true}'::jsonb)
on conflict (email) do update set
	password_hash = excluded.password_hash,
	first_name = excluded.first_name,
	last_name = excluded.last_name,
	role = excluded.role,
	phone = excluded.phone,
	metadata = excluded.metadata,
	updated_at = now();

insert into public.admin_auth (admin_user_id, auth_label, secret_hash, is_active)
select id, 'primary', '$2b$10$zFNHb3V7ybe277wrhHmBUusP3zbDSSCu1V/kZGfFEpmGCsMjYA7by', true
from public.users
where email = 'admin@beattheheat.local'
on conflict (admin_user_id, auth_label) do update set
	secret_hash = excluded.secret_hash,
	is_active = excluded.is_active,
	updated_at = now();
