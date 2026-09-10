-- Single-row manual override the principal can toggle from Settings to show
-- a class-suspension style banner on the public Front Screen TV display.
create table if not exists public.campus_alerts (
	school_id text primary key default 'school-1' references public.schools(id) on delete cascade,
	active boolean not null default false,
	title text not null default 'CLASS SUSPENSION',
	message text not null default 'All classes are suspended.',
	updated_at timestamptz not null default now()
);
