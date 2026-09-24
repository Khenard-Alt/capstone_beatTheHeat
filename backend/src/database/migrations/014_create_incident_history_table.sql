-- Resolved incidents move out of the active `incidents` table into this one,
-- so head teachers get a genuinely separate resolved-case history instead of
-- just a status flag on the same live table.
create table if not exists public.incident_history (
	id uuid primary key default gen_random_uuid(),
	original_incident_id uuid not null,
	school_id text references public.schools(id),
	reporter_id uuid references public.users(id),
	student_id text references public.students(id),
	type varchar(100) not null,
	description text not null,
	action_taken text,
	heat_index_at_time decimal(5,2),
	resolved_by uuid references public.users(id),
	resolution_notes text,
	created_at timestamptz not null,
	resolved_at timestamptz not null default now()
);

create index if not exists idx_incident_history_school on public.incident_history(school_id);
create index if not exists idx_incident_history_resolved_at on public.incident_history(resolved_at desc);
