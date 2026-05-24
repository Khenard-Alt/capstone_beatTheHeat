-- Add missing columns to ai_analysis_logs to support duplicate_count and updated_at
alter table if exists public.ai_analysis_logs
    add column if not exists duplicate_count integer default 0;

alter table if exists public.ai_analysis_logs
    add column if not exists updated_at timestamptz default now();

-- Ensure updated_at is set on update (optional trigger-friendly column)
-- Note: triggers are not added here to avoid altering remote DB behavior unexpectedly.
