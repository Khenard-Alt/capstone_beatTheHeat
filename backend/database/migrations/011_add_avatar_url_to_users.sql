-- Add avatar_url column to users so every role can have a profile picture.
alter table if exists public.users
    add column if not exists avatar_url text;
