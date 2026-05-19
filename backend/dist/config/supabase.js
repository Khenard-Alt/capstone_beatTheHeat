"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSupabaseAdminClient = exports.isSupabaseConfigured = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const getSupabaseConfig = () => ({
    supabaseUrl: process.env.SUPABASE_URL ?? '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
});
const isSupabaseConfigured = () => getSupabaseConfig().supabaseUrl.trim().length > 0 &&
    getSupabaseConfig().serviceRoleKey.trim().length > 0;
exports.isSupabaseConfigured = isSupabaseConfigured;
let cachedClient = null;
let cachedKey = null;
let cachedUrl = null;
const getSupabaseAdminClient = () => {
    const { supabaseUrl, serviceRoleKey } = getSupabaseConfig();
    if (!(0, exports.isSupabaseConfigured)()) {
        return null;
    }
    const configChanged = cachedUrl !== supabaseUrl || cachedKey !== serviceRoleKey;
    if (!cachedClient || configChanged) {
        cachedClient = (0, supabase_js_1.createClient)(supabaseUrl, serviceRoleKey, {
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
exports.getSupabaseAdminClient = getSupabaseAdminClient;
//# sourceMappingURL=supabase.js.map