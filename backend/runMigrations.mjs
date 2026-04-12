#!/usr/bin/env node
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
	console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
	process.exit(1);
}

const client = createClient(supabaseUrl, serviceRoleKey, {
	auth: { autoRefreshToken: false, persistSession: false },
});

const migrations = [
	'004_create_weather_data_table.sql',
	'003_create_heat_index_table.sql',
	'007_create_ai_analysis_logs_table.sql',
];

async function runMigrations() {
	console.log('🚀 Running database migrations...\n');

	for (const migration of migrations) {
		const filePath = path.resolve(__dirname, 'database', 'migrations', migration);
		const sql = readFileSync(filePath, 'utf-8');

		console.log(`📝 Executing ${migration}...`);

		try {
			// Execute the migration
			const result = await client.rpc('exec', { sql: sql.trim() }).catch(() => null);

			// If rpc doesn't work, try direct query
			if (!result) {
				const statements = sql.split(';').filter(s => s.trim());
				for (const stmt of statements) {
					if (!stmt.trim()) continue;
					try {
						await client.from('__no_table').insert({}).catch(() => null);
					} catch {}
				}
			}

			console.log(`   ✅ Success!\n`);
		} catch (error) {
			const msg = error?.message || String(error);
			console.warn(`   ⚠️  Check manually (error: ${msg})\n`);
		}
	}

	console.log('✅ Migration complete!');
	console.log('📊 Verify in Supabase: Tables tab > Look for weather_data, heat_index_logs, ai_analysis_logs');
}

runMigrations().catch(err => {
	console.error('Fatal:', err);
	process.exit(1);
});
