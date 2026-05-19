import { WeatherSnapshot } from '../types';
declare class WeatherService {
    getCurrentWeather(lat?: number, lon?: number): Promise<WeatherSnapshot>;
    private persistSnapshot;
    private toSnapshot;
    private getFallbackWeather;
    private calculateHeatIndexC;
    private getHeatLevel;
}
export declare const weatherService: WeatherService;
export {};
//# sourceMappingURL=weather.service.d.ts.map