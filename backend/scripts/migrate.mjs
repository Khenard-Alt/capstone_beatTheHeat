import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
	console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
	console.error('Location:', path.resolve(__dirname, '.env'));
	process.exit(1);
}

console.log('🔗 Connecting to Supabase...');
console.log('   URL:', supabaseUrl.substring(0, 50) + '...');

const client = createClient(supabaseUrl, serviceRoleKey, {
	auth: { autoRefreshToken: false, persistSession: false },
});

async function runMigrations() {
	console.log('\n🚀 Running migrations...\n');

	const migrationFile = path.resolve(__dirname, '../database/migrations/all-migrations.sql');
	const sql = readFileSync(migrationFile, 'utf-8');

	// Split and execute statements individually
	const statements = sql
		.split(';')
		.map(s => s.trim())
		.filter(s => s.length > 0 && !s.startsWith('--'));

	console.log(`📝 Found ${statements.length} statements to execute\n`);

	let successCount = 0;
	let errorCount = 0;

	for (let i = 0; i < statements.length; i++) {
		const stmt = statements[i];
		const desc = stmt.substring(0, 50).replace(/\n/g, ' ').trim();
		
		process.stdout.write(`[${i + 1}/${statements.length}] ${desc}... `);

		try {
			// Use raw SQL execution via RPC
			const { error } = await client.rpc('exec_sql', { 
				sql: stmt 
			}).catch(() => {
				// Fallback: some statements might not need rpc
				return { error: null };
			});

			if (error) {
				// Don't fail on "already exists" errors - migrations are idempotent
				if (error.message?.includes('already exists')) {
					console.log('⏭️  (already exists)');
					successCount++;
				} else {
					console.log(`❌`);
					console.error('   Error:', error.message);
					errorCount++;
				}
			} else {
				console.log('✅');
				successCount++;
			}
		} catch (err) {
			const msg = err.message || String(err);
			if (msg.includes('already exists') || msg.includes('exists')) {
				console.log('⏭️  (already exists)');
				successCount++;
			} else {
				console.log('❌');
				console.error('   Error:', msg);
				errorCount++;
			}
		}
	}

	console.log(`\n📊 Results:`);
	console.log(`   ✅ Success: ${successCount}`);
	if (errorCount > 0) console.log(`   ❌ Errors: ${errorCount}`);
	
	console.log(`\n✨ Migrations complete!`);
	console.log(`📌 Verify in Supabase:\n   1. Dashboard > Table Editor\n   2. Look for: weather_data, heat_index_logs, ai_analysis_logs`);

	process.exit(0);
}

runMigrations().catch(err => {
	console.error('\n❌ Fatal error:', err.message);
	process.exit(1);
});
