export interface SmsGatewayHealth {
    provider: 'android-heartbeat' | 'twilio';
    configured: boolean;
    online: boolean;
    hasLoad: boolean;
    ready: boolean;
    details: string;
}
export declare const getSmsGatewayHealth: () => Promise<SmsGatewayHealth>;
export declare const sendHeatAlertSms: (phone: string, recipientName: string, heatLevel: string, heatIndex: number) => Promise<boolean>;
//# sourceMappingURL=sms.service.d.ts.map