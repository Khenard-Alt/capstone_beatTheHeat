"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSupabaseAdminClient = exports.isSupabaseConfigured = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const supabaseUrl = process.env.SUPABASE_URL ?? '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
const isSupabaseConfigured = () => supabaseUrl.trim().length > 0 && serviceRoleKey.trim().length > 0;
exports.isSupabaseConfigured = isSupabaseConfigured;
let cachedClient = null;
const getSupabaseAdminClient = () => {
    if (!(0, exports.isSupabaseConfigured)()) {
        return null;
    }
    if (!cachedClient) {
        cachedClient = (0, supabase_js_1.createClient)(supabaseUrl, serviceRoleKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        });
    }
    return cachedClient;
};
exports.getSupabaseAdminClient = getSupabaseAdminClient;
//# sourceMappingURL=supabase.js.map