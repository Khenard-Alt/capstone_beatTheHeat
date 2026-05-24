import { WeatherForecastDay, WeatherSnapshot } from '../types';
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
export interface WeatherForecastResult {
    requestedDays: number;
    mode: 'onecall-daily' | 'five-day-forecast' | 'current-api-no-key';
    location: string;
    days: WeatherForecastDay[];
    notes: string[];
}
declare class WeatherService {
    private readonly schoolLocationName;
    collectScheduledSnapshot(lat?: number, lon?: number): Promise<WeatherSnapshot>;
    backfillRecentDays(days: number, lat?: number, lon?: number, intervalHours?: number): Promise<WeatherBackfillResult>;
    getCurrentWeather(lat?: number, lon?: number): Promise<WeatherSnapshot>;
    getForecastOutlook(days?: number, lat?: number, lon?: number): Promise<WeatherForecastResult>;
    private fetchHistoricalSnapshots;
    private tryFetchOneCallForecast;
    private fetchFiveDayForecast;
    private toDailyForecastDay;
    private toFiveDayForecastDay;
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