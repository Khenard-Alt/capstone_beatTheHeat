import { Request, Response, NextFunction } from 'express';
export declare const getPendingApprovals: (_req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getSchoolReports: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getPrincipalStats: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const getIncidentTrends: (req: Request, res: Response, next: NextFunction) => Promise<void>;
declare const _default: {
    getPendingApprovals: (_req: Request, res: Response, next: NextFunction) => Promise<void>;
    getSchoolReports: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getPrincipalStats: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    getIncidentTrends: (req: Request, res: Response, next: NextFunction) => Promise<void>;
};
export default _default;
//# sourceMappingURL=principalController.d.ts.map