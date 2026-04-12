import { createClient, SupabaseClient } from '@supabase/supabase-js';

const getSupabaseConfig = (): { supabaseUrl: string; serviceRoleKey: string } => ({
	supabaseUrl: process.env.SUPABASE_URL ?? '',
	serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
});

export const isSupabaseConfigured = (): boolean =>
	getSupabaseConfig().supabaseUrl.trim().length > 0 &&
	getSupabaseConfig().serviceRoleKey.trim().length > 0;

let cachedClient: SupabaseClient | null = null;
let cachedKey: string | null = null;
let cachedUrl: string | null = null;

export const getSupabaseAdminClient = (): SupabaseClient | null => {
	const { supabaseUrl, serviceRoleKey } = getSupabaseConfig();

	if (!isSupabaseConfigured()) {
		return null;
	}

	const configChanged = cachedUrl !== supabaseUrl || cachedKey !== serviceRoleKey;

	if (!cachedClient || configChanged) {
		cachedClient = createClient(supabaseUrl, serviceRoleKey, {
			auth: {
				autoRefreshToken: false,
				persistSession: false,
			},
		});
		cachedUrl = supabaseUrl;
		cachedKey = serviceRoleKey;
	}

	return cachedClient;
};
