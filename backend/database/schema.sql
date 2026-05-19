-- Beat The Heat core identity schema
-- Covers admin, principal, head-teacher, teacher, staff, parent, and students.

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

