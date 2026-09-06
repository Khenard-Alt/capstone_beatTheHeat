import { Request, Response, NextFunction } from 'express';
export declare const getCurrentWeather: (_req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getWeatherForecast: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const runScheduledSnapshot: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const runWeatherBackfill: (req: Request, res: Response, next: NextFunction) => Promise<void>;
//# sourceMappingURL=weatherController.d.ts.map