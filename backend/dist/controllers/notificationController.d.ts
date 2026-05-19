import { Request, Response, NextFunction } from 'express';
export declare const notificationController: {
    /**
     * Send heat alert email to users
     */
    sendHeatAlert: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Send health advisory notification email
     */
    sendAdvisoryNotification: (req: Request, res: Response, next: NextFunction) => Promise<void>;
    /**
     * Broadcast heat alert to all users in a school
     */
    broadcastHeatAlert: (req: Request, res: Response, next: NextFunction) => Promise<void>;
};
//# sourceMappingURL=notificationController.d.ts.map