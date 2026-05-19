-- Beat The Heat seed data
-- Default plaintext credentials used to generate hashes:
-- admin@beattheheat.local / Admin#2026
-- parent@beattheheat.local / Parent#2026
-- teacher@beattheheat.local / Teacher#2026
-- admin_auth primary secret (admin only): AdminAuth#2026

create extension if not exists pgcrypto;

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

update public.students
set parent_user_id = (
	select id from public.users where email = 'parent@beattheheat.local' limit 1
)
where id in ('s1', 's2');

insert into public.parent_student_guardians (parent_user_id, student_id, relationship_type, is_primary)
select u.id, s.id, 'parent', true
from public.users u
join public.students s on s.id in ('s1', 's2')
where u.email = 'parent@beattheheat.local'
on conflict (parent_user_id, student_id) do update set
	relationship_type = excluded.relationship_type,
	is_primary = excluded.is_primary;
