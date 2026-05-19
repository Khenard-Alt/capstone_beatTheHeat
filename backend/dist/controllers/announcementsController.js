"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.announcementsController = void 0;
const promises_1 = require("fs/promises");
const path_1 = __importDefault(require("path"));
const supabase_1 = require("../config/supabase");
const loadLocalAnnouncements = async () => {
    const sample = [
        {
            id: 'local-1',
            title: 'Heat monitoring active',
            body: 'School is monitoring heat index. Encourage hydration and light clothing today.',
            created_at: new Date().toISOString(),
            priority: 'info',
        },
    ];
    // Try reading an announcements log if present (non-fatal)
    try {
        const p = path_1.default.resolve(process.cwd(), 'logs', 'announcements.jsonl');
        const raw = await (0, promises_1.readFile)(p, 'utf-8');
        const rows = raw
            .split(/\r?\n/)
            .filter(Boolean)
            .map((l) => {
            try {
                return JSON.parse(l);
            }
            catch {
                return null;
            }
        })
            .filter(Boolean);
        if (rows.length > 0)
            return rows;
    }
    catch {
        // ignore
    }
    return sample;
};
exports.announcementsController = {
    getAnnouncements: async (req, res, next) => {
        try {
            const limit = parseInt(req.query.limit || '10', 10);
            const offset = parseInt(req.query.offset || '0', 10);
            const supabase = (0, supabase_1.getSupabaseAdminClient)();
            if (!supabase) {
                const local = await loadLocalAnnouncements();
                res.status(200).json({ success: true, data: local.slice(offset, offset + limit) });
                return;
            }
            const { data, error, count } = await supabase
                .from('announcements')
                .select('id, title, body, priority, created_at', { count: 'exact' })
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);
            if (error) {
                res.status(500).json({ success: false, message: 'Failed to fetch announcements', error: error.message });
                return;
            }
            res.status(200).json({ success: true, data: data || [], pagination: { limit, offset, total: count || 0 } });
        }
        catch (error) {
            next(error);
            return;
        }
    },
};
exports.default = exports.announcementsController;
//# sourceMappingURL=announcementsController.js.map