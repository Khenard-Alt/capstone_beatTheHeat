"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.incidentsController = void 0;
const promises_1 = require("fs/promises");
const path_1 = __importDefault(require("path"));
const aiAnalysis_service_1 = require("../services/aiAnalysis.service");
const weather_service_1 = require("../services/weather.service");
const supabase_1 = require("../config/supabase");
const email_service_1 = require("../services/email.service");
const LOCAL_LOG = path_1.default.resolve(process.cwd(), 'logs', 'health-incidents.jsonl');
const loadLocalIncidents = async () => {
    try {
        const raw = await (0, promises_1.readFile)(LOCAL_LOG, 'utf-8');
        return raw
            .split(/\r?\n/)
            .filter(Boolean)
            .map((line) => {
            try {
                return JSON.parse(line);
            }
            catch {
                return null;
            }
        })
            .filter(Boolean);
    }
    catch {
        return [];
    }
};
const saveLocalIncidents = async (records) => {
    const content = records.map((record) => JSON.stringify(record)).join('\n');
    await (0, promises_1.writeFile)(LOCAL_LOG, content ? `${content}\n` : '', 'utf-8');
};
const formatPersonName = (person) => {
    if (!person) {
        return null;
    }
    const parts = [person.first_name, person.last_name].filter(Boolean).join(' ').trim();
    return parts || person.email || null;
};
const getIncidentDetails = (incident) => {
    const incidentType = String(incident?.incidentType || incident?.type || '').toLowerCase();
    const description = String(incident?.description || '').toLowerCase();
    const actionTaken = String(incident?.actionTaken || incident?.action_taken || '').toLowerCase();
    const heatIndex = typeof incident?.heatIndex === 'number'
        ? incident.heatIndex
        : Number(incident?.heatIndex ?? incident?.heat_index_at_time);
    const hasHighHeat = Number.isFinite(heatIndex) && heatIndex >= 41;
    const symptomHints = [
        'dizzy',
        'dizziness',
        'cramp',
        'asthma',
        'nausea',
        'headache',
        'faint',
        'weak',
        'shortness of breath',
        'breathing',
        'vomit',
        'dehydration',
        'exhaustion',
        'fatigue',
    ].filter((hint) => description.includes(hint) || actionTaken.includes(hint));
    return { incidentType, description, actionTaken, heatIndex, hasHighHeat, symptomHints };
};
const buildIncidentSuggestion = (incident) => {
    const { incidentType, description, actionTaken, hasHighHeat, symptomHints } = getIncidentDetails(incident);
    if (incidentType.includes('asthma-attack') || symptomHints.includes('breathing')) {
        return 'Keep the student calm and seated, give the prescribed inhaler if available, monitor breathing closely, and notify the clinic and parent right away if symptoms do not improve.';
    }
    if (incidentType.includes('heat-exhaustion') || incidentType.includes('dehydration') || hasHighHeat || symptomHints.includes('dehydration') || symptomHints.includes('exhaustion')) {
        return 'Move the student to a cool shaded area, give water if conscious, loosen tight clothing, and recheck every 10-15 minutes before escalating to the clinic or parent if needed.';
    }
    if (incidentType.includes('dizziness') || symptomHints.includes('dizzy') || symptomHints.includes('faint')) {
        return 'Let the student sit or lie down, provide water in small sips, keep them out of direct sun, and watch for worsening symptoms before sending for clinic support.';
    }
    if (incidentType.includes('nausea') || symptomHints.includes('vomit')) {
        return 'Keep the student in a cool area, avoid heavy activity, offer water carefully, and refer to the clinic if nausea continues or vomiting appears.';
    }
    if (incidentType.includes('headache') || symptomHints.includes('headache')) {
        return 'Move the student to rest in a quiet cool space, give hydration, and monitor whether the headache improves before deciding on clinic referral.';
    }
    if (incidentType.includes('other') || description.length > 0 || actionTaken.length > 0) {
        return 'Keep the student safe, add the specific symptoms and response taken, inform the proper school staff, and update the report with any follow-up action needed.';
    }
    return 'Keep the student safe, document the situation clearly, inform the proper school staff, and update the report with any follow-up action taken.';
};
const generateIncidentSuggestion = async (incident) => {
    const fallbackSuggestion = buildIncidentSuggestion(incident);
    const { incidentType, description, actionTaken, heatIndex, hasHighHeat } = getIncidentDetails(incident);
    try {
        const query = [
            'Create a short but specific head-teacher action suggestion for this student incident report.',
            `Incident type: ${incidentType || 'unknown'}`,
            `Description: ${description || 'none'}`,
            `Action taken: ${actionTaken || 'none'}`,
            `Heat index: ${Number.isFinite(heatIndex) ? heatIndex : 'unknown'}`,
            `High heat flag: ${hasHighHeat ? 'yes' : 'no'}`,
            'Write 1-2 sentences that are tailored to the incident details and avoid repeating the same generic wording for every case.',
            'Focus on the most relevant immediate action, escalation step, and follow-up based on the symptoms and current action taken.',
        ].join(' ');
        const weather = await weather_service_1.weatherService.getCurrentWeather();
        const advisory = await aiAnalysis_service_1.aiAnalysisService.generateScopedAdvisory({
            query,
            weather,
            single: true,
            lang: 'english',
        });
        return advisory.singleResponse || advisory.summary || fallbackSuggestion;
    }
    catch {
        return fallbackSuggestion;
    }
};
const mapIncidentRow = (row, studentsById, reportersById, parentsById) => {
    const student = row.student_id ? studentsById[row.student_id] : null;
    const reporter = row.reporter_id ? reportersById[row.reporter_id] : null;
    const parent = student?.parent_user_id ? parentsById[student.parent_user_id] : null;
    const reporterName = formatPersonName(reporter);
    const parentName = formatPersonName(parent);
    return {
        id: row.id,
        schoolId: row.school_id || null,
        reporterId: row.reporter_id || null,
        reporterName,
        reporterRole: reporter?.role || null,
        studentId: row.student_id || null,
        studentName: student ? `${student.first_name || ''} ${student.last_name || ''}`.trim() : null,
        gradeLevel: student?.grade_level || null,
        section: student?.section || null,
        parentName,
        parentEmail: parent?.email || null,
        incidentType: row.type,
        description: row.description || null,
        severity: null,
        symptoms: [],
        heatIndex: row.heat_index_at_time || null,
        temperature: null,
        timestamp: row.created_at || null,
        actionTaken: row.action_taken || null,
        reportedBy: reporterName || row.reporter_id || null,
        status: row.status || null,
        aiSuggestion: buildIncidentSuggestion({
            incidentType: row.type,
            description: row.description,
            actionTaken: row.action_taken,
            heatIndex: row.heat_index_at_time,
            status: row.status,
        }),
    };
};
exports.incidentsController = {
    list: async (req, res, next) => {
        try {
            const limit = parseInt(req.query.limit || '20', 10);
            const offset = parseInt(req.query.offset || '0', 10);
            const supabase = (0, supabase_1.getSupabaseAdminClient)();
            if (!supabase) {
                const local = await loadLocalIncidents();
                const data = local.slice(offset, offset + limit).map((record) => ({
                    ...record,
                    aiSuggestion: record.aiSuggestion || buildIncidentSuggestion(record),
                }));
                res.status(200).json({
                    success: true,
                    data,
                    pagination: { limit, offset, total: local.length },
                });
                return;
            }
            // Read from the canonical `incidents` table and enrich with student info
            const { data: incidents, error: incidentsError, count } = await supabase
                .from('incidents')
                .select('id, school_id, reporter_id, student_id, type, description, action_taken, heat_index_at_time, status, created_at', { count: 'exact' })
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);
            if (incidentsError || !incidents) {
                res.status(200).json({
                    success: true,
                    data: [],
                    pagination: { limit, offset, total: 0 },
                    message: 'No incident data available',
                });
                return;
            }
            // Collect student and reporter IDs and fetch related records
            const studentIds = Array.from(new Set(incidents.map((it) => it.student_id).filter(Boolean)));
            const reporterIds = Array.from(new Set(incidents.map((it) => it.reporter_id).filter(Boolean)));
            let studentsById = {};
            let reportersById = {};
            let parentsById = {};
            if (studentIds.length > 0) {
                const { data: studs } = await supabase.from('students').select('id, first_name, last_name, grade_level, section, parent_user_id').in('id', studentIds);
                (studs || []).forEach((u) => {
                    studentsById[u.id] = u;
                });
            }
            const parentIds = Array.from(new Set(Object.values(studentsById).map((student) => student?.parent_user_id).filter(Boolean)));
            if (parentIds.length > 0) {
                const { data: parents } = await supabase.from('users').select('id, first_name, last_name, role, email').in('id', parentIds);
                (parents || []).forEach((u) => {
                    parentsById[u.id] = u;
                });
            }
            if (reporterIds.length > 0) {
                const { data: reporters } = await supabase.from('users').select('id, first_name, last_name, role, email').in('id', reporterIds);
                (reporters || []).forEach((u) => {
                    reportersById[u.id] = u;
                });
            }
            let mapped = (incidents || []).map((row) => mapIncidentRow(row, studentsById, reportersById, parentsById));
            // If there are no incidents in the canonical `incidents` table, attempt to read from legacy `health_incidents` view
            if ((mapped || []).length === 0) {
                const { data: legacyData, error: legacyError, count: legacyCount } = await supabase
                    .from('health_incidents')
                    .select('id, student_name, grade_level, section, incident_type, severity, symptoms, heat_index, temperature, timestamp, action_taken, reported_by, status', { count: 'exact' })
                    .order('timestamp', { ascending: false })
                    .range(offset, offset + limit - 1);
                if (!legacyError && legacyData) {
                    mapped = (legacyData || []).map((row) => ({
                        id: row.id,
                        studentId: null,
                        studentName: row.student_name,
                        gradeLevel: row.grade_level,
                        section: row.section,
                        incidentType: row.incident_type,
                        description: row.description || null,
                        severity: row.severity,
                        symptoms: Array.isArray(row.symptoms) ? row.symptoms : [],
                        heatIndex: row.heat_index,
                        temperature: row.temperature,
                        timestamp: row.timestamp,
                        actionTaken: row.action_taken,
                        reportedBy: row.reported_by,
                        status: row.status,
                        schoolId: row.school_id || null,
                        reporterId: row.reporter_id || null,
                        reporterName: row.reported_by || null,
                        reporterRole: row.reporter_role || null,
                        parentName: row.parent_name || null,
                        parentEmail: row.parent_email || null,
                        aiSuggestion: buildIncidentSuggestion({
                            incidentType: row.incident_type,
                            description: row.description,
                            actionTaken: row.action_taken,
                            heatIndex: row.heat_index,
                            status: row.status,
                        }),
                    }));
                    res.status(200).json({
                        success: true,
                        data: mapped,
                        pagination: { limit, offset, total: legacyCount || 0 },
                    });
                    return;
                }
            }
            res.status(200).json({
                success: true,
                data: mapped,
                pagination: { limit, offset, total: count || 0 },
            });
        }
        catch (error) {
            next(error);
        }
    },
    create: async (req, res, next) => {
        try {
            const { schoolId, reporterId, studentId, type, description, actionTaken, heatIndex } = req.body;
            if (!type || !description) {
                res.status(400).json({ success: false, message: 'Missing required fields' });
                return;
            }
            const supabase = (0, supabase_1.getSupabaseAdminClient)();
            if (!supabase) {
                const record = { id: `local-${Date.now()}`, schoolId, reporterId, studentId, type, description, actionTaken, heatIndex, status: 'pending', created_at: new Date().toISOString() };
                const aiSuggestion = await generateIncidentSuggestion(record);
                const recordWithSuggestion = { ...record, aiSuggestion };
                await (0, promises_1.appendFile)(LOCAL_LOG, JSON.stringify(recordWithSuggestion) + '\n');
                res.status(201).json({ success: true, data: recordWithSuggestion });
                return;
            }
            const payload = {
                school_id: schoolId || null,
                reporter_id: reporterId || null,
                student_id: studentId || null,
                type,
                description,
                action_taken: actionTaken || null,
                heat_index_at_time: heatIndex || null,
                status: 'pending',
            };
            const { data, error } = await supabase.from('incidents').insert([payload]).select('*').single();
            if (error) {
                res.status(500).json({ success: false, message: 'Failed to create incident', error: error.message });
                return;
            }
            const aiSuggestion = await generateIncidentSuggestion({ ...payload, ...data });
            // Optionally notify parents/teachers when request includes notify flags
            try {
                const notifyParents = req.body.notifyParents === true || req.body.notifyParents === 'true';
                const notifyTeachers = req.body.notifyTeachers === true || req.body.notifyTeachers === 'true';
                if (notifyParents || notifyTeachers) {
                    const subject = `Incident reported: ${String(payload.type || 'Student incident')}`;
                    const html = (0, email_service_1.buildAnnouncementHtml)(subject, String(payload.description || 'An incident was reported.'));
                    if (notifyParents) {
                        // If a student_id exists, try to fetch parent for targeted notification
                        if (payload.student_id) {
                            const { data: studentRows } = await supabase.from('students').select('parent_user_id').eq('id', payload.student_id).limit(1).single();
                            const parentId = studentRows?.parent_user_id;
                            if (parentId) {
                                const { data: parent } = await supabase.from('users').select('email').eq('id', parentId).limit(1).single();
                                if (parent?.email)
                                    await (0, email_service_1.sendEmail)(parent.email, subject, html);
                            }
                        }
                        else {
                            const { data: parents } = await supabase.from('users').select('email').eq('role', 'parent');
                            const parentEmails = (parents || []).map((p) => p.email).filter(Boolean);
                            if (parentEmails.length > 0)
                                await (0, email_service_1.sendEmail)(parentEmails, subject, html);
                        }
                    }
                    if (notifyTeachers) {
                        const { data: teachers } = await supabase.from('users').select('email').eq('role', 'teacher');
                        const teacherEmails = (teachers || []).map((t) => t.email).filter(Boolean);
                        if (teacherEmails.length > 0)
                            await (0, email_service_1.sendEmail)(teacherEmails, subject, html);
                    }
                }
            }
            catch (e) {
                console.warn('Failed to send incident notifications', e);
            }
            res.status(201).json({ success: true, data: { ...data, aiSuggestion } });
            return;
        }
        catch (err) {
            next(err);
            return;
        }
    },
    getById: async (req, res, next) => {
        try {
            const { id } = req.params;
            const supabase = (0, supabase_1.getSupabaseAdminClient)();
            if (!supabase) {
                const local = await loadLocalIncidents();
                const record = local.find((item) => String(item.id) === String(id));
                if (!record) {
                    res.status(404).json({ success: false, message: 'Incident not found' });
                    return;
                }
                res.status(200).json({ success: true, data: { ...record, aiSuggestion: record.aiSuggestion || buildIncidentSuggestion(record) } });
                return;
            }
            const { data, error } = await supabase
                .from('incidents')
                .select('id, school_id, reporter_id, student_id, type, description, action_taken, heat_index_at_time, status, created_at')
                .eq('id', id)
                .single();
            if (error || !data) {
                res.status(404).json({ success: false, message: 'Incident not found' });
                return;
            }
            const studentIds = data.student_id ? [data.student_id] : [];
            const reporterIds = data.reporter_id ? [data.reporter_id] : [];
            const studentsById = {};
            const reportersById = {};
            const parentsById = {};
            if (studentIds.length > 0) {
                const { data: studs } = await supabase.from('students').select('id, first_name, last_name, grade_level, section, parent_user_id').in('id', studentIds);
                (studs || []).forEach((student) => {
                    studentsById[student.id] = student;
                });
            }
            const parentIds = Array.from(new Set(Object.values(studentsById).map((student) => student?.parent_user_id).filter(Boolean)));
            if (parentIds.length > 0) {
                const { data: parents } = await supabase.from('users').select('id, first_name, last_name, role, email').in('id', parentIds);
                (parents || []).forEach((parent) => {
                    parentsById[parent.id] = parent;
                });
            }
            if (reporterIds.length > 0) {
                const { data: reporters } = await supabase.from('users').select('id, first_name, last_name, role, email').in('id', reporterIds);
                (reporters || []).forEach((reporter) => {
                    reportersById[reporter.id] = reporter;
                });
            }
            const mapped = mapIncidentRow(data, studentsById, reportersById, parentsById);
            res.status(200).json({ success: true, data: mapped });
        }
        catch (error) {
            next(error);
        }
    },
    update: async (req, res, next) => {
        try {
            const { id } = req.params;
            const { schoolId, reporterId, studentId, type, description, actionTaken, heatIndex, status } = req.body;
            const updates = {};
            if (typeof schoolId === 'string')
                updates.school_id = schoolId || null;
            if (typeof reporterId === 'string')
                updates.reporter_id = reporterId || null;
            if (typeof studentId === 'string')
                updates.student_id = studentId || null;
            if (typeof type === 'string' && type.trim())
                updates.type = type.trim();
            if (typeof description === 'string' && description.trim())
                updates.description = description.trim();
            if (typeof actionTaken === 'string')
                updates.action_taken = actionTaken.trim();
            if (typeof heatIndex !== 'undefined') {
                const parsedHeatIndex = heatIndex === null || heatIndex === '' ? null : Number(heatIndex);
                updates.heat_index_at_time = Number.isFinite(parsedHeatIndex) ? parsedHeatIndex : null;
            }
            if (typeof status === 'string' && status.trim())
                updates.status = status.trim();
            if (Object.keys(updates).length === 0) {
                res.status(400).json({ success: false, message: 'No incident fields provided to update' });
                return;
            }
            const supabase = (0, supabase_1.getSupabaseAdminClient)();
            if (!supabase) {
                const local = await loadLocalIncidents();
                const index = local.findIndex((item) => String(item.id) === String(id));
                if (index === -1) {
                    res.status(404).json({ success: false, message: 'Incident not found' });
                    return;
                }
                local[index] = { ...local[index], ...updates, updated_at: new Date().toISOString() };
                await saveLocalIncidents(local);
                res.status(200).json({ success: true, data: local[index] });
                return;
            }
            const { data, error } = await supabase.from('incidents').update(updates).eq('id', id).select('*').single();
            if (error || !data) {
                res.status(500).json({ success: false, message: 'Failed to update incident', error: error?.message || 'Unknown error' });
                return;
            }
            // Optionally notify on updates if flags provided
            try {
                const notifyParents = req.body.notifyParents === true || req.body.notifyParents === 'true';
                const notifyTeachers = req.body.notifyTeachers === true || req.body.notifyTeachers === 'true';
                if (notifyParents || notifyTeachers) {
                    const subject = `Incident update: ${data.type || 'Student incident'}`;
                    const html = (0, email_service_1.buildAnnouncementHtml)(subject, `Status: ${data.status}\n\n${data.action_taken || data.description || ''}`);
                    if (notifyParents) {
                        if (data.student_id) {
                            const { data: studentRows } = await supabase.from('students').select('parent_user_id').eq('id', data.student_id).limit(1).single();
                            const parentId = studentRows?.parent_user_id;
                            if (parentId) {
                                const { data: parent } = await supabase.from('users').select('email').eq('id', parentId).limit(1).single();
                                if (parent?.email)
                                    await (0, email_service_1.sendEmail)(parent.email, subject, html);
                            }
                        }
                        else {
                            const { data: parents } = await supabase.from('users').select('email').eq('role', 'parent');
                            const parentEmails = (parents || []).map((p) => p.email).filter(Boolean);
                            if (parentEmails.length > 0)
                                await (0, email_service_1.sendEmail)(parentEmails, subject, html);
                        }
                    }
                    if (notifyTeachers) {
                        const { data: teachers } = await supabase.from('users').select('email').eq('role', 'teacher');
                        const teacherEmails = (teachers || []).map((t) => t.email).filter(Boolean);
                        if (teacherEmails.length > 0)
                            await (0, email_service_1.sendEmail)(teacherEmails, subject, html);
                    }
                }
            }
            catch (e) {
                console.warn('Failed to send incident update notifications', e);
            }
            res.status(200).json({ success: true, data });
        }
        catch (error) {
            next(error);
        }
    },
    remove: async (req, res, next) => {
        try {
            const { id } = req.params;
            const supabase = (0, supabase_1.getSupabaseAdminClient)();
            if (!supabase) {
                const local = await loadLocalIncidents();
                const nextRecords = local.filter((item) => String(item.id) !== String(id));
                if (nextRecords.length === local.length) {
                    res.status(404).json({ success: false, message: 'Incident not found' });
                    return;
                }
                await saveLocalIncidents(nextRecords);
                res.status(200).json({ success: true, message: 'Incident deleted' });
                return;
            }
            const { error } = await supabase.from('incidents').delete().eq('id', id);
            if (error) {
                res.status(500).json({ success: false, message: 'Failed to delete incident', error: error.message });
                return;
            }
            res.status(200).json({ success: true, message: 'Incident deleted' });
        }
        catch (error) {
            next(error);
        }
    },
};
exports.default = exports.incidentsController;
//# sourceMappingURL=incidentsController.js.map