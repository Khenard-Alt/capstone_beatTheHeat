"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendHeatAlertSms = exports.getSmsGatewayHealth = void 0;
const axios_1 = __importDefault(require("axios"));
const environment_1 = require("../config/environment");
const normalizePhone = (phone) => {
    const cleaned = phone.replace(/[^\d+]/g, '');
    if (cleaned.startsWith('+')) {
        return cleaned;
    }
    if (cleaned.startsWith('0')) {
        return `+63${cleaned.slice(1)}`;
    }
    if (cleaned.startsWith('63')) {
        return `+${cleaned}`;
    }
    return cleaned;
};
const isCloudSmsGateway = () => environment_1.env.androidSmsGatewayUrl.includes('api.sms-gate.app');
const getGatewayBaseUrl = () => {
    try {
        const parsed = new URL(environment_1.env.androidSmsGatewayUrl);
        return `${parsed.protocol}//${parsed.host}`;
    }
    catch {
        return environment_1.env.androidSmsGatewayUrl.replace(/\/3rdparty\/v1\/.+$/i, '');
    }
};
const getCloudSmsGatewayToken = async () => {
    if (!environment_1.env.androidSmsGatewayUsername || !environment_1.env.androidSmsGatewayPassword) {
        return null;
    }
    try {
        const baseUrl = getGatewayBaseUrl();
        const response = await axios_1.default.post(`${baseUrl}/3rdparty/v1/auth/token`, {
            ttl: 3600,
            scopes: ['messages:send', 'messages:read', 'devices:list'],
        }, {
            auth: {
                username: environment_1.env.androidSmsGatewayUsername,
                password: environment_1.env.androidSmsGatewayPassword,
            },
            headers: {
                'Content-Type': 'application/json',
            },
            timeout: Math.max(1000, environment_1.env.androidSmsHeartbeatTimeoutMs),
        });
        return response.data.access_token ?? response.data.accessToken ?? response.data.token ?? null;
    }
    catch (error) {
        console.warn('[SMS] Failed to obtain cloud JWT token:', error instanceof Error ? error.message : error);
        return null;
    }
};
const getSmsGatewayHealth = async () => {
    if (environment_1.env.smsProvider === 'android-heartbeat') {
        if (!(0, environment_1.hasAndroidSmsGatewayConfig)()) {
            return {
                provider: 'android-heartbeat',
                configured: false,
                online: false,
                hasLoad: false,
                ready: false,
                details: 'Android SMS gateway env values are missing.',
            };
        }
        if (isCloudSmsGateway()) {
            const token = await getCloudSmsGatewayToken();
            if (!token) {
                return {
                    provider: 'android-heartbeat',
                    configured: true,
                    online: false,
                    hasLoad: false,
                    ready: false,
                    details: 'Failed to generate cloud JWT token.',
                };
            }
            try {
                const response = await axios_1.default.get(`${getGatewayBaseUrl()}/3rdparty/v1/health`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    timeout: Math.max(1000, environment_1.env.androidSmsHeartbeatTimeoutMs),
                });
                const health = response.data;
                const online = String(health?.status ?? '').toLowerCase() === 'pass';
                return {
                    provider: 'android-heartbeat',
                    configured: true,
                    online,
                    hasLoad: online,
                    ready: online,
                    details: online ? 'Cloud SMS gateway is ready.' : 'Cloud SMS gateway health check failed.',
                };
            }
            catch (error) {
                return {
                    provider: 'android-heartbeat',
                    configured: true,
                    online: false,
                    hasLoad: false,
                    ready: false,
                    details: `Failed cloud health request: ${error instanceof Error ? error.message : 'unknown error'}`,
                };
            }
        }
        try {
            const headers = environment_1.env.androidSmsGatewayApiKey
                ? { Authorization: `Bearer ${environment_1.env.androidSmsGatewayApiKey}` }
                : undefined;
            const heartbeatResponse = await axios_1.default.get(environment_1.env.androidSmsHeartbeatUrl, {
                timeout: Math.max(1000, environment_1.env.androidSmsHeartbeatTimeoutMs),
                headers,
            });
            const heartbeat = heartbeatResponse.data;
            const online = heartbeat?.online === true;
            const hasLoad = heartbeat?.hasLoad === true;
            const ready = online && hasLoad && heartbeat?.canSendSms !== false;
            return {
                provider: 'android-heartbeat',
                configured: true,
                online,
                hasLoad,
                ready,
                details: ready
                    ? 'Android SMS gateway is online and ready.'
                    : 'Android gateway reachable but not ready (offline/no load/canSendSms=false).',
            };
        }
        catch (error) {
            return {
                provider: 'android-heartbeat',
                configured: true,
                online: false,
                hasLoad: false,
                ready: false,
                details: `Failed heartbeat request: ${error instanceof Error ? error.message : 'unknown error'}`,
            };
        }
    }
    const configured = (0, environment_1.hasTwilioConfig)();
    return {
        provider: 'twilio',
        configured,
        online: configured,
        hasLoad: true,
        ready: configured,
        details: configured ? 'Twilio credentials detected.' : 'Twilio credentials missing.',
    };
};
exports.getSmsGatewayHealth = getSmsGatewayHealth;
const sendHeatAlertSms = async (phone, recipientName, heatLevel, heatIndex) => {
    const to = normalizePhone(phone);
    if (!to) {
        return false;
    }
    const message = `Beat The Heat Alert for ${recipientName}: Heat level ${String(heatLevel).toUpperCase()} at ${heatIndex.toFixed(1)}C. Keep hydrated and follow school safety advisories.`;
    if (environment_1.env.smsProvider === 'android-heartbeat') {
        const health = await (0, exports.getSmsGatewayHealth)();
        if (!health.ready) {
            console.warn(`[SMS] Android SMS app not ready. ${health.details}`);
            return false;
        }
        try {
            if (isCloudSmsGateway()) {
                const token = await getCloudSmsGatewayToken();
                if (!token) {
                    console.warn('[SMS] Cloud token unavailable.');
                    return false;
                }
                const resp = await axios_1.default.post(`${getGatewayBaseUrl()}/3rdparty/v1/messages`, {
                    phoneNumbers: [to],
                    textMessage: { text: message },
                }, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                    timeout: 15000,
                });
                console.info('[SMS] Cloud send response:', resp?.status, resp?.data);
            }
            else {
                const headers = environment_1.env.androidSmsGatewayApiKey
                    ? { Authorization: `Bearer ${environment_1.env.androidSmsGatewayApiKey}` }
                    : undefined;
                const auth = environment_1.env.androidSmsGatewayUsername
                    ? { username: environment_1.env.androidSmsGatewayUsername, password: environment_1.env.androidSmsGatewayPassword }
                    : undefined;
                const payload = { textMessage: { text: message }, phoneNumbers: [to], tag: 'heat-alert' };
                const resp = await axios_1.default.post(environment_1.env.androidSmsGatewayUrl, payload, {
                    headers,
                    auth,
                    timeout: 15000,
                });
                console.info('[SMS] Local send response:', resp?.status, resp?.data);
            }
            return true;
        }
        catch (error) {
            console.error('[SMS] Failed to send via Android heartbeat gateway:', error);
            return false;
        }
    }
    if (!(0, environment_1.hasTwilioConfig)()) {
        console.warn('[SMS] Twilio is not configured. Skipping SMS dispatch.');
        return false;
    }
    try {
        const form = new URLSearchParams();
        form.append('To', to);
        form.append('From', environment_1.env.twilioPhoneNumber);
        form.append('Body', message);
        await axios_1.default.post(`https://api.twilio.com/2010-04-01/Accounts/${environment_1.env.twilioAccountSid}/Messages.json`, form, {
            auth: {
                username: environment_1.env.twilioAccountSid,
                password: environment_1.env.twilioAuthToken,
            },
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            timeout: 15000,
        });
        return true;
    }
    catch (error) {
        console.error('[SMS] Failed to send heat alert SMS:', error);
        return false;
    }
};
exports.sendHeatAlertSms = sendHeatAlertSms;
//# sourceMappingURL=sms.service.js.map