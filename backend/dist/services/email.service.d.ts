/**
 * Send OTP email
 */
export declare const sendOTPEmail: (email: string, otpCode: string, expiresIn: number) => Promise<boolean>;
/**
 * Send welcome email after registration
 */
export declare const sendWelcomeEmail: (email: string, firstName: string, studentName: string) => Promise<boolean>;
/**
 * Send heat alert email with project branding
 */
export declare const sendHeatAlertEmail: (email: string, recipientName: string, schoolName: string, heatLevel: string, heatIndex: number, recommendations: string[]) => Promise<boolean>;
/**
 * Send health advisory notification email
 */
export declare const sendAdvisoryNotificationEmail: (email: string, recipientName: string, schoolName: string, advisoryTitle: string, advisoryText: string, riskLevel: "low" | "medium" | "high" | "critical") => Promise<boolean>;
//# sourceMappingURL=email.service.d.ts.map