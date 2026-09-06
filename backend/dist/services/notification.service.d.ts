import { WeatherSnapshot } from '../types';
declare class NotificationService {
    private readonly lastDispatchBySchool;
    private shouldNotifyForLevel;
    private isWithinCooldown;
    private fetchRecipients;
    private saveInAppNotifications;
    dispatchHeatAlerts(snapshot: WeatherSnapshot): Promise<void>;
    dispatchAdvisoryForSnapshot(snapshot: WeatherSnapshot): Promise<void>;
}
export declare const notificationService: NotificationService;
export {};
//# sourceMappingURL=notification.service.d.ts.map