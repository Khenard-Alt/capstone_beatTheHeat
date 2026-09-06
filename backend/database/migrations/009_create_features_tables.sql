-- Announcements Table
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id text REFERENCES public.schools(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    priority VARCHAR(50) DEFAULT 'info',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Incidents (Conduct Reports) Table
CREATE TABLE IF NOT EXISTS public.incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id text REFERENCES public.schools(id) ON DELETE CASCADE,
    reporter_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    student_id text REFERENCES public.students(id) ON DELETE SET NULL,
    type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    action_taken TEXT,
    heat_index_at_time DECIMAL(5,2),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Health Advisories Table (AI Reports)
CREATE TABLE IF NOT EXISTS public.health_advisories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id text REFERENCES public.schools(id) ON DELETE CASCADE,
    risk_level VARCHAR(50) NOT NULL,
    summary TEXT NOT NULL,
    actions JSONB DEFAULT '[]'::jsonb,
    safety_tips JSONB DEFAULT '[]'::jsonb,
    confidence_score DECIMAL(5,2),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Parent Messages / Concerns
CREATE TABLE IF NOT EXISTS public.parent_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    school_id text REFERENCES public.schools(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'unread',
    reply TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    replied_at TIMESTAMPTZ
);
