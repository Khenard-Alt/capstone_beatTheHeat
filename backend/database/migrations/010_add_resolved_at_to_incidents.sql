-- Track when an incident was marked resolved so parent-facing views can
-- auto-hide it 24 hours after resolution instead of showing it forever.
ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
