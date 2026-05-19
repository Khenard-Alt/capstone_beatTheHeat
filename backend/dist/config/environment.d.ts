export declare const env: {
    readonly nodeEnv: string;
    readonly port: number;
    readonly corsOrigin: string;
    readonly openWeatherApiKey: string;
    readonly googleGeminiApiKey: string;
    readonly schoolLat: number;
    readonly schoolLon: number;
    readonly weatherSchedulerToken: string;
    readonly aiModelProvider: "gemini" | "python" | "fallback";
    readonly pythonExecutable: string;
    readonly pythonModelDir: string;
    readonly pythonScriptPath: string;
};
export declare const hasWeatherApiKey: () => boolean;
export declare const hasGeminiApiKey: () => boolean;
export declare const hasWeatherSchedulerToken: () => boolean;
//# sourceMappingURL=environment.d.ts.map