"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationsController = void 0;
const supabase_1 = require("../config/supabase");
const email_service_1 = require("../services/email.service");
const fetchParentEmails = async (supabase, schoolId) => {
    if (!supabase)
        return [];
    let q = supabase.from('users').select('email').eq('role', 'parent');
    if (schoolId)
        q = q.eq('school_id', schoolId);
    const { data, error } = await q;
    if (error || !data)
        return [];
    return data.map((r) => r.email).filter(Boolean);
};
exports.notificationsController = {
    sendAdvisoryEmails: async (req, res, next) => {
        try {
            const { schoolId, advisory } = req.body;
            if (!advisory) {
                res.status(400).json({ success: false, message: 'Missing advisory payload' });
                return;
            }
            const supabase = (0, supabase_1.getSupabaseAdminClient)();
            const parents = supabase ? await fetchParentEmails(supabase, schoolId) : [];
            if (parents.length === 0) {
                res.status(200).json({ success: true, message: 'No parent emails found to notify' });
                return;
            }
            const subject = `Health Advisory: ${advisory.title || 'Important Update'}`;
            const html = `<p>${advisory.advisoryText || ''}</p><p>Recommendations: ${JSON.stringify(advisory.recommendations || [])}</p>`;
            await (0, email_service_1.sendEmail)(parents, subject, html);
            res.status(200).json({ success: true, notified: parents.length });
            return;
        }
        catch (err) {
            next(err);
            return;
        }
    },
};
exports.default = exports.notificationsController;
//# sourceMappingURL=notificationsController.js.map