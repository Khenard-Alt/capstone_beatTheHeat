-- Links a student to their advisory (homeroom) teacher so parent<->teacher
-- messaging can be scoped to the actual adviser instead of every teacher
-- in the school.
ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS advisory_teacher_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_students_advisory_teacher
  ON public.students (advisory_teacher_id);
