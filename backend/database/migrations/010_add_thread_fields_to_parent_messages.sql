-- Add thread metadata so parent/teacher conversations can be rendered as messenger threads.
ALTER TABLE public.parent_messages
  ADD COLUMN IF NOT EXISTS teacher_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sender_role VARCHAR(20);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'parent_messages_sender_role_check'
  ) THEN
    ALTER TABLE public.parent_messages
      ADD CONSTRAINT parent_messages_sender_role_check
      CHECK (sender_role IN ('parent', 'teacher'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_parent_messages_parent_created_at
  ON public.parent_messages (parent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_parent_messages_teacher_created_at
  ON public.parent_messages (teacher_id, created_at DESC);