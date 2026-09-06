import nodemailer from 'nodemailer';

// For development, use Ethereal Email (test email service)
// In production, replace with real email provider
let transporter: nodemailer.Transporter | null = null;

/**
 * Initialize email transporter
 */
const initializeTransporter = async (): Promise<nodemailer.Transporter | null> => {
  if (transporter) return transporter;

  try {
    const hasSmtpCredentials = !!(process.env.EMAIL_USER && process.env.EMAIL_PASSWORD);

    // Prefer configured SMTP in every environment so real deliveries can work during development.
    if (hasSmtpCredentials) {
      transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD,
        },
      });

      console.log('[EMAIL] ✓ Configured SMTP service initialized');
      return transporter;
    }

    // Fall back to Ethereal only when no SMTP credentials are available.
    console.log('[EMAIL] Initializing Ethereal test account...');
    const testAccount = await nodemailer.createTestAccount();

    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    console.log('[EMAIL] ✓ Ethereal test account ready');
    console.log('[EMAIL] Test credentials:', {
      email: testAccount.user,
      password: testAccount.pass,
    });
    return transporter;
    
  } catch (error) {
    console.error('[EMAIL] Failed to initialize transporter:', error);
    return null;
  }
};

/**
 * Generic send email helper
 */
export const sendEmail = async (to: string | string[], subject: string, html: string, text?: string): Promise<boolean> => {
  try {
    const transport = await initializeTransporter();
    if (!transport) {
      console.warn('[EMAIL] Transporter not configured, skipping send to', to);
      return false;
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@beattheheat.com',
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]+>/g, ''),
    } as any;

    const info = await transport.sendMail(mailOptions);
    if (process.env.NODE_ENV !== 'production') {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) console.log('[EMAIL] Preview URL:', previewUrl);
    }
    return true;
  } catch (error) {
    console.error('[EMAIL] Failed to send email:', error);
    return false;
  }
};

/**
 * Send OTP email
 */
export const sendOTPEmail = async (email: string, otpCode: string, expiresIn: number): Promise<boolean> => {
  try {
    const transport = await initializeTransporter();
    
    if (!transport) {
      console.error('[EMAIL] Transporter not available');
      return false;
    }

    const expiresInMinutes = Math.round(expiresIn / 60);

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@beattheheat.com',
      to: email,
      subject: 'Beat The Heat - Email Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e40af;">Email Verification</h2>
          <p>Hello!</p>
          <p>Your verification code is:</p>
          <div style="background: #f0f9ff; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <h1 style="color: #2563eb; letter-spacing: 5px; margin: 0;">${otpCode}</h1>
          </div>
          <p><strong>This code expires in ${expiresInMinutes} minutes.</strong></p>
          <p>If you didn't request this code, please ignore this email.</p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="color: #64748b; font-size: 12px;">This is an automated message from Beat The Heat. Please do not reply to this email.</p>
        </div>
      `,
    };

    console.log(`[EMAIL] Sending OTP to ${email}...`);
    const info = await transport.sendMail(mailOptions);
    
    console.log(`[EMAIL] ✓ OTP sent successfully`);
    
    // For test emails, show preview URL
    if (process.env.NODE_ENV !== 'production') {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log(`[EMAIL] Preview URL: ${previewUrl}`);
    }

    return true;
  } catch (error) {
    console.error('[EMAIL] ✗ Failed to send OTP:', error);
    return false;
  }
};

/**
 * Send welcome email after registration
 */
export const sendWelcomeEmail = async (
  email: string,
  firstName: string,
  studentName: string
): Promise<boolean> => {
  try {
    const transport = await initializeTransporter();
    
    if (!transport) {
      console.error('[EMAIL] Transporter not available');
      return false;
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@beattheheat.com',
      to: email,
      subject: 'Welcome to Beat The Heat!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1e40af;">Welcome to Beat The Heat!</h2>
          <p>Hello ${firstName},</p>
          <p>Your registration is complete! You can now monitor real-time heat alerts and health advisories for <strong>${studentName}</strong>.</p>
          <div style="background: #f0fdf4; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <h3 style="color: #15803d; margin-top: 0;">What you can do:</h3>
            <ul style="color: #166534;">
              <li>View real-time heat index and weather data</li>
              <li>Receive instant health advisories</li>
              <li>Get notifications for extreme heat warnings</li>
              <li>Track historical data and trends</li>
            </ul>
          </div>
          <p style="margin-top: 30px;">
            <a href="${process.env.APP_URL || 'https://beattheheat.com'}/dashboard" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Go to Dashboard</a>
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
          <p style="color: #64748b; font-size: 12px;">This is an automated message from Beat The Heat. Please do not reply to this email.</p>
        </div>
      `,
    };

    console.log(`[EMAIL] Sending welcome email to ${email}...`);
    const info = await transport.sendMail(mailOptions);
    
    console.log(`[EMAIL] ✓ Welcome email sent successfully`);
    
    if (process.env.NODE_ENV !== 'production') {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log(`[EMAIL] Preview URL: ${previewUrl}`);
    }

    return true;
  } catch (error) {
    console.error('[EMAIL] ✗ Failed to send welcome email:', error);
    return false;
  }
};

/**
 * Send heat alert email with project branding
 */
export const sendHeatAlertEmail = async (
  email: string,
  recipientName: string,
  schoolName: string,
  heatLevel: string,
  heatIndex: number,
  recommendations: string[]
): Promise<boolean> => {
  try {
    const transport = await initializeTransporter();
    
    if (!transport) {
      console.error('[EMAIL] Transporter not available');
      return false;
    }

    // Color mapping for heat levels
    const levelColors: Record<string, { bg: string; border: string; text: string }> = {
      'extreme-danger': { bg: '#991b1b', border: '#dc2626', text: '#fee2e2' },
      'danger': { bg: '#7c2d12', border: '#ea580c', text: '#fed7aa' },
      'extreme-caution': { bg: '#92400e', border: '#d97706', text: '#fef3c7' },
      'caution': { bg: '#78350f', border: '#f59e0b', text: '#fef08a' },
      'normal': { bg: '#065f46', border: '#10b981', text: '#d1fae5' },
    };

    const colors = levelColors[heatLevel] || levelColors['normal'];

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@beattheheat.com',
      to: email,
      subject: `🌡️ Heat Alert: ${heatLevel.toUpperCase().replace('-', ' ')} at ${schoolName}`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
          <!-- Header with brand colors -->
          <div style="background: linear-gradient(135deg, #0f766e 0%, #0f172a 50%, #1d4ed8 100%); padding: 30px 20px; text-align: center;">
            <h1 style="color: #fef08a; margin: 0; font-size: 28px;">🌡️ HEAT ALERT</h1>
            <p style="color: #e0e7ff; margin: 5px 0 0 0;">Beat The Heat - ${schoolName}</p>
          </div>

          <!-- Alert Box -->
          <div style="background: ${colors.bg}; border-left: 5px solid ${colors.border}; padding: 20px; margin: 20px; border-radius: 6px;">
            <h2 style="color: #ffffff; margin-top: 0;">Heat Level: ${heatLevel.toUpperCase().replace('-', ' ')}</h2>
            <p style="color: #e0e7ff; font-size: 16px;">Heat Index: <strong>${heatIndex.toFixed(1)}°C</strong></p>
          </div>

          <!-- Content -->
          <div style="padding: 20px; color: #0f172a;">
            <p>Hello ${recipientName},</p>
            <p style="color: #475569;">A heat alert has been issued for <strong>${schoolName}</strong>. Please take the following precautions:</p>

            <!-- Recommendations -->
            <div style="background: #eff6ff; border-left: 4px solid #0f766e; padding: 16px; margin: 20px 0; border-radius: 4px;">
              <h3 style="color: #0f766e; margin-top: 0;">Recommended Actions:</h3>
              <ul style="color: #0f172a; padding-left: 20px;">
                ${recommendations.map(rec => `<li style="margin: 8px 0;">${rec}</li>`).join('')}
              </ul>
            </div>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.APP_URL || 'https://beattheheat.com'}/advisory" style="background: linear-gradient(135deg, #0f766e, #1d4ed8); color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">View Full Advisory</a>
            </div>
          </div>

          <!-- Footer -->
          <div style="background: #0f172a; color: #cbd5e1; padding: 20px; text-align: center; font-size: 12px;">
            <p style="margin: 5px 0;">Stay Safe! Beat The Heat</p>
            <p style="margin: 5px 0; color: #94a3b8;">This is an automated alert from Beat The Heat. Do not reply to this email.</p>
          </div>
        </div>
      `,
    };

    console.log(`[EMAIL] Sending heat alert to ${email}...`);
    const info = await transport.sendMail(mailOptions);
    
    console.log(`[EMAIL] ✓ Heat alert email sent successfully`);
    
    if (process.env.NODE_ENV !== 'production') {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log(`[EMAIL] Preview URL: ${previewUrl}`);
    }

    return true;
  } catch (error) {
    console.error('[EMAIL] ✗ Failed to send heat alert:', error);
    return false;
  }
};

/**
 * Build a branded HTML email for announcements
 */
export const buildAnnouncementHtml = (title: string, body: string) => {
  const appUrl = process.env.APP_URL || 'https://beattheheat.com';
  const safeBody = String(body).replace(/\n/g, '<br/>');
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; color: #0f172a; background:#f8fafc; padding:20px;">
      <div style="max-width:600px; margin:0 auto; background:#ffffff; border-radius:8px; overflow:hidden; box-shadow:0 4px 18px rgba(2,6,23,0.08);">
        <div style="padding:22px; background:linear-gradient(90deg,#0f766e 0%,#1e40af 100%); color:#fff; text-align:center;">
          <h1 style="margin:0; font-size:20px; line-height:1.1;">Beat The Heat</h1>
          <p style="margin:6px 0 0 0; opacity:0.9; font-size:13px;">Important Announcement</p>
        </div>

        <div style="padding:20px;">
          <h2 style="font-size:18px; margin:0 0 10px 0; color:#0f172a;">${title}</h2>
          <div style="color:#334155; font-size:14px; line-height:1.45;">${safeBody}</div>

          <div style="margin-top:20px; text-align:left;">
            <a href="${appUrl}/dashboard" style="display:inline-block; background:#0f766e; color:#fff; text-decoration:none; padding:10px 16px; border-radius:6px; font-weight:600;">Open Dashboard</a>
          </div>
        </div>

        <div style="padding:14px 20px; background:#f8fafc; border-top:1px solid #eef2f7; font-size:12px; color:#64748b; text-align:center;">
          <div>You're receiving this because you're subscribed to Beat The Heat notifications.</div>
          <div style="margin-top:6px;">Manage preferences in the app or contact <a href="mailto:support@beattheheat.com">support@beattheheat.com</a></div>
        </div>
      </div>
    </div>
  `;
};

/**
 * Send health advisory notification email
 */
export const sendAdvisoryNotificationEmail = async (
  email: string,
  recipientName: string,
  schoolName: string,
  advisoryTitle: string,
  advisoryText: string,
  riskLevel: 'low' | 'medium' | 'high' | 'critical'
): Promise<boolean> => {
  try {
    const transport = await initializeTransporter();
    
    if (!transport) {
      console.error('[EMAIL] Transporter not available');
      return false;
    }

    const riskColors: Record<string, { bg: string; icon: string }> = {
      'critical': { bg: '#991b1b', icon: '🚨' },
      'high': { bg: '#92400e', icon: '⚠️' },
      'medium': { bg: '#78350f', icon: '⏰' },
      'low': { bg: '#065f46', icon: '✅' },
    };

    const risk = riskColors[riskLevel] || riskColors['medium'];

    const mailOptions = {
      from: process.env.EMAIL_FROM || 'noreply@beattheheat.com',
      to: email,
      subject: `${risk.icon} Health Advisory from ${schoolName}: ${advisoryTitle}`,
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background: #f8fafc;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #0f766e 0%, #0f172a 50%, #1d4ed8 100%); padding: 25px 20px; text-align: center;">
            <h1 style="color: #fef08a; margin: 0; font-size: 24px;">${risk.icon} HEALTH ADVISORY</h1>
            <p style="color: #e0e7ff; margin: 5px 0 0 0;">From ${schoolName}</p>
          </div>

          <!-- Risk Level Badge -->
          <div style="background: ${risk.bg}; color: white; padding: 15px 20px; margin: 15px 20px 0 20px; border-radius: 6px 6px 0 0; font-weight: bold;">
            Risk Level: ${riskLevel.toUpperCase()}
          </div>

          <!-- Content -->
          <div style="background: white; padding: 20px; margin: 0 20px 20px 20px; border-radius: 0 0 6px 6px; border-bottom: 3px solid #0f766e;">
            <p>Dear ${recipientName},</p>
            
            <h2 style="color: #0f172a; border-bottom: 2px solid #fef08a; padding-bottom: 10px;">${advisoryTitle}</h2>
            
            <p style="color: #475569; line-height: 1.6;">${advisoryText}</p>

            <!-- Info Box -->
            <div style="background: #eff6ff; border-left: 4px solid #1d4ed8; padding: 15px; margin: 20px 0; border-radius: 4px;">
              <p style="color: #0f172a; margin: 0;">
                <strong>📋 Important:</strong> Please ensure all staff and students follow the recommended health and safety guidelines outlined in your school's heat emergency protocol.
              </p>
            </div>
          </div>

          <!-- CTA Button -->
          <div style="text-align: center; margin: 20px;">
            <a href="${process.env.APP_URL || 'https://beattheheat.com'}/health-advisory" style="background: linear-gradient(135deg, #0f766e, #1d4ed8); color: white; padding: 12px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">View All Advisories</a>
          </div>

          <!-- Footer -->
          <div style="background: #0f172a; color: #cbd5e1; padding: 20px; text-align: center; font-size: 12px;">
            <p style="margin: 5px 0;">Stay Safe! Beat The Heat</p>
            <p style="margin: 5px 0; color: #94a3b8;">This is an automated notification. Please do not reply to this email.</p>
          </div>
        </div>
      `,
    };

    console.log(`[EMAIL] Sending advisory notification to ${email}...`);
    const info = await transport.sendMail(mailOptions);
    
    console.log(`[EMAIL] ✓ Advisory notification sent successfully`);
    
    if (process.env.NODE_ENV !== 'production') {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      console.log(`[EMAIL] Preview URL: ${previewUrl}`);
    }

    return true;
  } catch (error) {
    console.error('[EMAIL] ✗ Failed to send advisory notification:', error);
    return false;
  }
};

export default {
  initializeTransporter,
  sendOTPEmail,
  sendWelcomeEmail,
  sendHeatAlertEmail,
  sendAdvisoryNotificationEmail,
};
