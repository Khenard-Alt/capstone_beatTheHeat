const axios = require('axios');
require('dotenv').config();

async function main() {
  const id = process.argv[2];
  if (!id) {
    console.error('Usage: node scripts/checkDevice.js <deviceId>');
    process.exit(1);
  }

  const username = process.env.ANDROID_SMS_GATEWAY_USERNAME;
  const password = process.env.ANDROID_SMS_GATEWAY_PASSWORD;
  const baseUrl = (process.env.ANDROID_SMS_GATEWAY_URL || 'https://api.sms-gate.app').replace(/\/3rdparty\/.+$/i, '');

  try {
    const tokenResp = await axios.post(
      `${baseUrl}/3rdparty/v1/auth/token`,
      { ttl: 3600, scopes: ['devices:list', 'messages:read'] },
      { auth: { username, password }, headers: { 'Content-Type': 'application/json' }, timeout: 15000 }
    );
    const token = tokenResp.data.access_token || tokenResp.data.accessToken || tokenResp.data.token;
    if (!token) { console.error('No token received'); process.exit(2); }

    // Try device detail endpoint
    try {
      const resp = await axios.get(`${baseUrl}/3rdparty/v1/devices/${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${token}` }, timeout: 15000 });
      console.log('DEVICE_DETAIL:', JSON.stringify(resp.data, null, 2));
      return;
    } catch (err) {
      // fallback to list
      console.warn('Device detail failed, trying devices list...');
      const listResp = await axios.get(`${baseUrl}/3rdparty/v1/devices`, { headers: { Authorization: `Bearer ${token}` }, timeout: 15000 });
      console.log('DEVICES_LIST:', JSON.stringify(listResp.data, null, 2));
    }
  } catch (err) {
    if (err.response) console.error('HTTP=', err.response.status, err.response.data);
    else console.error(err.message);
    process.exit(4);
  }
}

main();
