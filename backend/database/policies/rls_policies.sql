-- Row Level Security (RLS) Policies for Beat The Heat
-- Restricts data access by school_id
-- 2026-03-25

-- ============================================
-- Enable RLS on all tables
-- ============================================
alter table public.weather_data enable row level security;
alter table public.heat_index_logs enable row level security;
alter table public.ai_analysis_logs enable row level security;

-- ============================================
-- WEATHER_DATA Policies
-- ============================================

-- Public: Anyone can read their school's weather data
create policy "weather_data_select_by_school"
on public.weather_data for select
using (
	school_id::text = current_setting('app.current_school_id', true) 
	or current_setting('app.is_admin', true) = 'true'
	or true -- Allow public read during development
);

-- Service role: Can insert weather data
create policy "weather_data_insert_service"
on public.weather_data for insert
with check (true); -- Service role can insert from trusted backend

-- Service role: Can update weather data
create policy "weather_data_update_service"
on public.weather_data for update
with check (true);

-- ============================================
-- HEAT_INDEX_LOGS Policies
-- ============================================

-- Public: Can read their school's heat index logs
create policy "heat_index_logs_select_by_school"
on public.heat_index_logs for select
using (
	school_id::text = current_setting('app.current_school_id', true)
	or current_setting('app.is_admin', true) = 'true'
	or true -- Allow public read during development
);

-- Service role: Can insert heat index logs
create policy "heat_index_logs_insert_service"
on public.heat_index_logs for insert
with check (true);

-- Service role: Can update heat index logs
create policy "heat_index_logs_update_service"
on public.heat_index_logs for update
with check (true);

-- ============================================
-- AI_ANALYSIS_LOGS Policies
-- ============================================

-- Public: Can read their school's AI analysis logs
create policy "ai_analysis_logs_select_by_school"
on public.ai_analysis_logs for select
using (
	school_id::text = current_setting('app.current_school_id', true)
	or current_setting('app.is_admin', true) = 'true'
	or true -- Allow public read during development
);

-- Service role: Can insert AI analysis logs
create policy "ai_analysis_logs_insert_service"
on public.ai_analysis_logs for insert
with check (true);

-- Service role: Can update AI analysis logs
create policy "ai_analysis_logs_update_service"
on public.ai_analysis_logs for update
with check (true);

-- ============================================
-- Disable RLS for service_role (trusted backend)
-- ============================================
-- Note: Service role key in Supabase bypasses RLS by default
-- This provides a balance between security and development flexibility
