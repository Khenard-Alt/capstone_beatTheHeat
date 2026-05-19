import { WeatherSnapshot } from '../types';
interface AILogInput {
    schoolId?: string;
    query: string;
    weather: WeatherSnapshot;
    model: string;
    responseText: string;
    tokenInput?: number;
    tokenOutput?: number;
    tokenTotal?: number;
    estimatedCostUsd?: number;
    source: 'gemini' | 'fallback' | 'python';
}
declare class AuditLogService {
    private readonly localAuditPath;
    logWeatherSnapshot(snapshot: WeatherSnapshot, schoolId?: string): Promise<void>;
    logAiAnalysis(input: AILogInput): Promise<void>;
    private insertWeatherRows;
    private appendLocal;
}
export declare const auditLogService: AuditLogService;
export {};
//# sourceMappingURL=auditLog.service.d.ts.map