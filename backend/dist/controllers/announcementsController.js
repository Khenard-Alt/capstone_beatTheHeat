"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.announcementsController = void 0;
const promises_1 = require("fs/promises");
const path_1 = __importDefault(require("path"));
const supabase_1 = require("../config/supabase");
const email_service_1 = require("../services/email.service");
const fallbackRecipients = {
    parent: ['parent@beattheheat.local'],
    teacher: ['teacher@beattheheat.local'],
};
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
    createAnnouncement: async (req, res, next) => {
        try {
            const { schoolId, title, body, priority, audience } = req.body;
            if (!title || !body) {
                res.status(400).json({ success: false, message: 'Missing required fields' });
                return;
            }
            const supabase = (0, supabase_1.getSupabaseAdminClient)();
            if (!supabase) {
                const local = { id: `local-${Date.now()}`, title, body, priority: priority || 'info', created_at: new Date().toISOString() };
                // write to logs for offline dev
                const p = path_1.default.resolve(process.cwd(), 'logs', 'announcements.jsonl');
                await (0, promises_1.appendFile)(p, JSON.stringify(local) + '\n');
                const audienceTarget = String(audience || '').toLowerCase();
                const shouldNotifyParents = audienceTarget === 'global' || audienceTarget === 'parents' || req.body.notifyParents === true;
                const shouldNotifyTeachers = audienceTarget === 'global' || audienceTarget === 'teachers' || req.body.notifyTeachers === true;
                const subject = `Announcement: ${title}`;
                const html = (0, email_service_1.buildAnnouncementHtml)(title, body);
                if (shouldNotifyParents) {
                    await (0, email_service_1.sendEmail)(fallbackRecipients.parent, subject, html);
                }
                if (shouldNotifyTeachers) {
                    await (0, email_service_1.sendEmail)(fallbackRecipients.teacher, subject, html);
                }
                res.status(201).json({ success: true, data: local });
                return;
            }
            const insertPayload = { title, body, priority: priority || 'info' };
            if (schoolId)
                insertPayload.school_id = schoolId;
            const { data, error } = await supabase.from('announcements').insert([insertPayload]).select('*').single();
            if (error) {
                res.status(500).json({ success: false, message: 'Failed to create announcement', error: error.message });
                return;
            }
            const audienceTarget = String(audience || '').toLowerCase();
            const shouldNotifyParents = audienceTarget === 'global' ||
                audienceTarget === 'parents' ||
                req.body.notifyParents === true ||
                (req.body.priority && req.body.priority === 'critical');
            const shouldNotifyTeachers = audienceTarget === 'global' ||
                audienceTarget === 'teachers' ||
                req.body.notifyTeachers === true ||
                (req.body.priority && req.body.priority === 'critical');
            // If announcement is marked critical or notify flags are set, email parents and/or teachers
            try {
                const subject = `Announcement: ${data.title}`;
                const html = (0, email_service_1.buildAnnouncementHtml)(data.title, data.body);
                if (shouldNotifyParents) {
                    // If a school_id was set on the announcement, limit to that school; otherwise notify all parents
                    let parentQuery = supabase.from('users').select('email').eq('role', 'parent');
                    if (insertPayload.school_id)
                        parentQuery = parentQuery.eq('school_id', insertPayload.school_id);
                    const { data: parents } = await parentQuery;
                    const parentEmails = (parents || []).map((p) => p.email).filter(Boolean);
                    console.log('[ANNOUNCEMENT] parentEmails count:', parentEmails.length);
                    if (parentEmails.length > 0) {
                        await (0, email_service_1.sendEmail)(parentEmails, subject, html);
                    }
                }
                if (shouldNotifyTeachers) {
                    let teacherQuery = supabase.from('users').select('email').eq('role', 'teacher');
                    if (insertPayload.school_id)
                        teacherQuery = teacherQuery.eq('school_id', insertPayload.school_id);
                    const { data: teachers } = await teacherQuery;
                    const teacherEmails = (teachers || []).map((teacher) => teacher.email).filter(Boolean);
                    console.log('[ANNOUNCEMENT] teacherEmails count:', teacherEmails.length);
                    if (teacherEmails.length > 0) {
                        await (0, email_service_1.sendEmail)(teacherEmails, subject, html);
                    }
                }
            }
            catch (e) {
                console.warn('Failed to send announcement emails', e);
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
exports.default = exports.announcementsController;
//# sourceMappingURL=announcementsController.js.map