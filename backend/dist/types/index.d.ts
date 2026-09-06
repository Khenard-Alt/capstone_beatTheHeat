export interface WeatherSnapshot {
    source: 'openweathermap' | 'fallback';
    location: string;
    temperatureC: number;
    humidityPercent: number;
    condition: string;
    windSpeedMps: number;
    pressureHpa: number;
    heatIndexC: number;
    heatLevel: 'safe' | 'caution' | 'extreme-caution' | 'danger' | 'extreme-danger';
    timestamp: string;
}
export interface WeatherForecastDay {
    source: 'openweathermap' | 'fallback';
    location: string;
    date: string;
    temperatureC: number;
    humidityPercent: number;
    condition: string;
    windSpeedMps: number;
    pressureHpa: number;
    heatIndexC: number;
    heatLevel: 'safe' | 'caution' | 'extreme-caution' | 'danger' | 'extreme-danger';
}
export interface AdvisoryInput {
    query: string;
    weather: WeatherSnapshot;
    lang?: 'english' | 'tagalog' | 'taglish' | 'en' | 'tl';
    single?: boolean;
}
export interface AdvisoryResult {
    summary: string;
    riskLevel: string;
    actions: string[];
    safetyTips: string[];
    scopeNote: string;
    confidenceScore: number;
    decisionBasis: {
        heatIndexC: number;
        temperatureC: number;
        humidityPercent: number;
        heatLevel: string;
        dataSource: string;
        rationale: string[];
    };
    modelProfile: {
        mode: 'rule-grounded-ai';
        scope: 'system-only';
    };
    singleResponse?: string;
    healthDetails?: {
        symptoms?: string[];
        triagePriority?: 'urgent' | 'monitor' | 'low' | string;
        teacherChecklist?: string[];
        clinicActions?: string[];
        parentChecklist?: string[];
        recommendedFluidsAndVolumes?: string;
        coolingProcedures?: string[];
        whenToEscalate?: string;
        sampleAnnouncementText?: string;
    };
    extra?: string[];
}
//# sourceMappingURL=index.d.ts.map