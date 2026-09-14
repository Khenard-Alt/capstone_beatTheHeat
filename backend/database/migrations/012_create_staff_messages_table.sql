-- Staff-to-staff messaging (teacher-to-teacher, including advisory teacher
-- coordinating with a subject teacher). Mirrors parent_messages but both
-- sides are school staff, so it uses a plain sender/recipient pair.
CREATE TABLE IF NOT EXISTS public.staff_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_messages_sender ON public.staff_messages (sender_id);
CREATE INDEX IF NOT EXISTS idx_staff_messages_recipient ON public.staff_messages (recipient_id);
