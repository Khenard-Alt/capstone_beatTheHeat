import { Request, Response, NextFunction } from 'express';
export declare const notificationController: {
    /**
     * Send heat alert email to users
     */
    sendHeatAlert: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Send health advisory notification email
     */
    sendAdvisoryNotification: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
    /**
     * Broadcast heat alert to all users in a school
     */
    broadcastHeatAlert: (req: Request, res: Response, next: NextFunction) => Promise<Response<any, Record<string, any>> | undefined>;
};
//# sourceMappingURL=notificationController.d.ts.map