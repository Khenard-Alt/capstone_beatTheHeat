-- Seed features: announcements, incidents, health_advisories, parent_messages
-- Uses existing users and schools created by main seed

INSERT INTO public.announcements (school_id, title, body, priority)
SELECT 'school-1', 'Welcome back students', 'School monitoring heat index. Please hydrate and follow advisories.', 'info'
WHERE NOT EXISTS (SELECT 1 FROM public.announcements WHERE title = 'Welcome back students');

INSERT INTO public.health_advisories (school_id, risk_level, summary, actions, safety_tips, confidence_score)
SELECT 'school-1', 'caution', 'Moderate heat expected today. Reduce outdoor activities.', '["Move to shade","Provide water"]'::jsonb, '["Hydrate","Rest"]'::jsonb, 0.82
WHERE NOT EXISTS (SELECT 1 FROM public.health_advisories WHERE summary LIKE 'Moderate heat expected%');

-- Create an incident reported by teacher@beattheheat.local
INSERT INTO public.incidents (school_id, reporter_id, student_id, type, description, action_taken, heat_index_at_time)
SELECT 'school-1', u.id, 's1', 'heat_exhaustion', 'Student felt dizzy during PE; given water and rest.', 'Rested and hydrated', 37.5
FROM public.users u
WHERE u.email = 'teacher@beattheheat.local'
AND NOT EXISTS (SELECT 1 FROM public.incidents WHERE description LIKE 'Student felt dizzy during PE%');

-- Parent message
INSERT INTO public.parent_messages (parent_id, school_id, subject, body)
SELECT u.id, 'school-1', 'Concern about heat', 'Please advise on measures for outdoor activities.'
FROM public.users u
WHERE u.email = 'parent@beattheheat.local'
AND NOT EXISTS (SELECT 1 FROM public.parent_messages WHERE subject = 'Concern about heat');
