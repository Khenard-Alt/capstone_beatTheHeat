"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parentMessagesController = void 0;
const promises_1 = require("fs/promises");
const path_1 = __importDefault(require("path"));
const supabase_1 = require("../config/supabase");
const LOCAL_LOG = path_1.default.resolve(process.cwd(), 'logs', 'parent-messages.jsonl');
exports.parentMessagesController = {
    list: async (req, res, next) => {
        try {
            const limit = parseInt(req.query.limit || '20', 10);
            const offset = parseInt(req.query.offset || '0', 10);
            const supabase = (0, supabase_1.getSupabaseAdminClient)();
            if (!supabase) {
                // Read local file quickly by returning empty or sample
                res.status(200).json({ success: true, data: [] });
                return;
            }
            const { data, error, count } = await supabase
                .from('parent_messages')
                .select('id, parent_user_id, teacher_user_id, student_id, subject, body, created_at', { count: 'exact' })
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);
            if (error) {
                res.status(500).json({ success: false, message: 'Failed to fetch messages', error: error.message });
                return;
            }
            res.status(200).json({ success: true, data: data || [], pagination: { limit, offset, total: count || 0 } });
            return;
        }
        catch (err) {
            next(err);
            return;
        }
    },
    create: async (req, res, next) => {
        try {
            const { parentUserId, teacherUserId, studentId, subject, body } = req.body;
            if (!parentUserId || !teacherUserId || !subject || !body) {
                res.status(400).json({ success: false, message: 'Missing required fields' });
                return;
            }
            const supabase = (0, supabase_1.getSupabaseAdminClient)();
            if (!supabase) {
                const record = { id: `local-${Date.now()}`, parentUserId, teacherUserId, studentId, subject, body, created_at: new Date().toISOString() };
                await (0, promises_1.appendFile)(LOCAL_LOG, JSON.stringify(record) + '\n');
                res.status(201).json({ success: true, data: record });
                return;
            }
            const { data, error } = await supabase
                .from('parent_messages')
                .insert([{ parent_user_id: parentUserId, teacher_user_id: teacherUserId, student_id: studentId || null, subject, body }])
                .select('*')
                .single();
            if (error) {
                res.status(500).json({ success: false, message: 'Failed to save message', error: error.message });
                return;
            }
            res.status(201).json({ success: true, data });
            return;
        }
        catch (err) {
            next(err);
            return;
        }
    },
};
exports.default = exports.parentMessagesController;
//# sourceMappingURL=parentMessagesController.js.map