-- Tracks the current login session per user/device so a second device logging
-- into the same account can be challenged with a confirmation prompt on the
-- device that is already logged in.
create table if not exists public.active_sessions (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references public.users(id) on delete cascade,
	device_id text not null,
	device_label text not null,
	token text not null,
	status text not null default 'active', -- active | pending | denied | expired | revoked
	created_at timestamptz not null default now(),
	expires_at timestamptz
);

create index if not exists idx_active_sessions_user on public.active_sessions(user_id);
create index if not exists idx_active_sessions_status on public.active_sessions(user_id, status);
