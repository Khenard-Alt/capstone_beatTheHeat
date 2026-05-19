import { Request, Response, NextFunction } from 'express';
interface ApiError extends Error {
    statusCode?: number;
}
export declare const errorHandler: (err: ApiError, _req: Request, res: Response, _next: NextFunction) => void;
export {};
//# sourceMappingURL=errorHandler.middleware.d.ts.map