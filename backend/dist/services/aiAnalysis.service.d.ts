import { AdvisoryInput, AdvisoryResult } from '../types';
declare class AIAnalysisService {
    generateScopedAdvisory(input: AdvisoryInput): Promise<AdvisoryResult>;
    private logAdvisoryAudit;
    private estimateCostUsd;
    private systemPrompt;
    private scopeUserQuery;
    private parseAdvisory;
    private enforceOutputScope;
    private buildFallbackAdvisory;
    private safeScopeRedirect;
    private emptyResult;
}
export declare const aiAnalysisService: AIAnalysisService;
export {};
//# sourceMappingURL=aiAnalysis.service.d.ts.map