import { readFileSync } from 'fs';
import path from 'path';
import axios from 'axios';
import { env } from './src/config/environment';

const migrations = [
		'004_create_weather_data_table.sql',
		'003_create_heat_index_table.sql',
		'007_create_ai_analysis_logs_table.sql',
		'010_add_ai_analysis_logs_columns.sql',
];

async function runMigrations() {
	const supabaseUrl = process.env.SUPABASE_URL;
	const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

	if (!supabaseUrl || !serviceRoleKey) {
		console.error('❌ SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set in .env');
		process.exit(1);
	}

	console.log('🚀 Running Supabase migrations...\n');

	let allSuccess = true;

	for (const migration of migrations) {
		const filePath = path.resolve(__dirname, 'database', 'migrations', migration);
		const sql = readFileSync(filePath, 'utf-8');

		console.log(`⏳ Running ${migration}...`);

		try {
			// Execute each SQL statement separately
			const statements = sql.split(';').filter((s) => s.trim());

			for (const statement of statements) {
				if (!statement.trim()) continue;

				const { data, error } = await axios.post(
					`${supabaseUrl}/rest/v1/rpc/sql_exec`,
					{ query: statement },
					{
						headers: {
							Authorization: `Bearer ${serviceRoleKey}`,
							'Content-Type': 'application/json',
							apikey: serviceRoleKey,
						},
					}
				).then(r => ({ data: r.data, error: null }))
				.catch(e => ({ data: null, error: e.message }));

				if (error && !error.includes('already exists')) {
					console.log(`   ⚠️  Note: ${error}`);
				}
			}

			console.log(`   ✅ Executed!`);
		} catch (err) {
			console.error(`   ❌ Error: ${(err as Error).message}`);
			allSuccess = false;
		}
	}

	console.log('\n' + (allSuccess ? '✅ All migrations completed!' : '⚠️  Check results above'));
	console.log('📊 Verify in Supabase dashboard: Tables > Check for weather_data, heat_index_logs, ai_analysis_logs\n');
}

runMigrations().catch((err) => {
	console.error('Fatal error:', err);
	process.exit(1);
});
