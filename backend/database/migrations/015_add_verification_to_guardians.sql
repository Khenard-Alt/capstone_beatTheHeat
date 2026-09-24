-- Parent-child link verification: a registration claim is no longer trusted
-- outright — it sits as 'pending' (matched against the student's private
-- student_number) until an admin/head teacher approves it. Existing rows
-- default to 'approved' to preserve current behavior for links created
-- before this feature existed.
alter table public.parent_student_guardians
	add column if not exists status text not null default 'approved' check (status in ('pending', 'approved', 'rejected')),
	add column if not exists submitted_student_number text,
	add column if not exists id_photo_url text,
	add column if not exists reviewed_by uuid references public.users(id),
	add column if not exists reviewed_at timestamptz,
	add column if not exists rejection_reason text;

create index if not exists idx_parent_student_guardians_status on public.parent_student_guardians(status);

-- Backfill student_number for seeded students that don't have one yet, so
-- the verification flow has real values to test against.
update public.students set student_number = 'SN-' || substr(id, 5, 3) where student_number is null and id like 'stu-%';
update public.students set student_number = 'SN-' || upper(id) where student_number is null and id not like 'stu-%';
