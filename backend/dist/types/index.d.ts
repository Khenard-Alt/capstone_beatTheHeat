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
export interface AdvisoryInput {
    query: string;
    weather: WeatherSnapshot;
}
export interface AdvisoryResult {
    summary: string;
    riskLevel: string;
    actions: string[];
    safetyTips: string[];
    scopeNote: string;
}
//# sourceMappingURL=index.d.ts.map