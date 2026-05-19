import { WeatherSnapshot } from '../types';
interface WeatherBackfillFailure {
    dayOffset: number;
    reason: string;
}
export interface WeatherBackfillResult {
    requestedDays: number;
    intervalHours: number;
    inserted: number;
    mode: 'onecall-timemachine' | 'current-api-no-key';
    failures: WeatherBackfillFailure[];
    snapshots: WeatherSnapshot[];
}
declare class WeatherService {
    collectScheduledSnapshot(lat?: number, lon?: number): Promise<WeatherSnapshot>;
    backfillRecentDays(days: number, lat?: number, lon?: number, intervalHours?: number): Promise<WeatherBackfillResult>;
    getCurrentWeather(lat?: number, lon?: number): Promise<WeatherSnapshot>;
    private fetchHistoricalSnapshots;
    private toHistoricalSnapshot;
    private persistSnapshot;
    private toSnapshot;
    private getFallbackWeather;
    private calculateHeatIndexC;
    private getHeatLevel;
    private toErrorMessage;
}
export declare const weatherService: WeatherService;
export {};
//# sourceMappingURL=weather.service.d.ts.map