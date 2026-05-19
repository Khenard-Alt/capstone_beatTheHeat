"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.incidentsController = void 0;
const promises_1 = require("fs/promises");
const path_1 = __importDefault(require("path"));
const supabase_1 = require("../config/supabase");
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
exports.incidentsController = {
    list: async (req, res, next) => {
        try {
            const limit = parseInt(req.query.limit || '20', 10);
            const offset = parseInt(req.query.offset || '0', 10);
            const supabase = (0, supabase_1.getSupabaseAdminClient)();
            if (!supabase) {
                const local = await loadLocalIncidents();
                res.status(200).json({
                    success: true,
                    data: local.slice(offset, offset + limit),
                    pagination: { limit, offset, total: local.length },
                });
                return;
            }
            const { data, error, count } = await supabase
                .from('health_incidents')
                .select('id, student_name, grade_level, section, incident_type, severity, symptoms, heat_index, temperature, timestamp, action_taken, reported_by, status', { count: 'exact' })
                .order('timestamp', { ascending: false })
                .range(offset, offset + limit - 1);
            if (error) {
                res.status(200).json({
                    success: true,
                    data: [],
                    pagination: { limit, offset, total: 0 },
                    message: 'No incident data available',
                });
                return;
            }
            const mapped = (data ?? []).map((row) => ({
                id: row.id,
                studentName: row.student_name,
                gradeLevel: row.grade_level,
                section: row.section,
                incidentType: row.incident_type,
                severity: row.severity,
                symptoms: Array.isArray(row.symptoms) ? row.symptoms : [],
                heatIndex: row.heat_index,
                temperature: row.temperature,
                timestamp: row.timestamp,
                actionTaken: row.action_taken,
                reportedBy: row.reported_by,
                status: row.status,
            }));
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
};
exports.default = exports.incidentsController;
//# sourceMappingURL=incidentsController.js.map