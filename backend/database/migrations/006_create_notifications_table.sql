create extension if not exists pgcrypto;

create table if not exists public.notifications (
	id uuid primary key default gen_random_uuid(),
	user_id uuid not null references public.users(id) on delete cascade,
	type varchar(32) not null,
	title text not null,
	message text not null,
	status varchar(16) not null default 'unread' check (status in ('unread', 'read')),
	priority varchar(16) not null default 'medium' check (priority in ('low', 'medium', 'high')),
	sent_at timestamptz not null default now(),
	read_at timestamptz,
	created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_time
	on public.notifications (user_id, sent_at desc);

create index if not exists idx_notifications_user_status
	on public.notifications (user_id, status);
