import { STORAGE_KEYS } from './constants';

export const getDeviceId = (): string => {
  try {
    const existing = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);
    if (existing) return existing;

    const generated =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `device-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    localStorage.setItem(STORAGE_KEYS.DEVICE_ID, generated);
    return generated;
  } catch {
    return 'unknown-device';
  }
};

export const getDeviceLabel = (): string => {
  const ua = navigator.userAgent;

  let browser = 'Unknown browser';
  if (/Edg\//.test(ua)) browser = 'Edge';
  else if (/OPR\//.test(ua)) browser = 'Opera';
  else if (/Chrome\//.test(ua)) browser = 'Chrome';
  else if (/Firefox\//.test(ua)) browser = 'Firefox';
  else if (/Safari\//.test(ua)) browser = 'Safari';

  let os = 'Unknown device';
  if (/Windows/.test(ua)) os = 'Windows';
  else if (/Mac OS X/.test(ua)) os = 'macOS';
  else if (/Android/.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iPod/.test(ua)) os = 'iOS';
  else if (/Linux/.test(ua)) os = 'Linux';

  return `${browser} on ${os}`;
};
