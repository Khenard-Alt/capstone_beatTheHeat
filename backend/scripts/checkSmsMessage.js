const axios = require('axios');
require('dotenv').config();

async function main() {
  const id = process.argv[2];
  if (!id) {
    console.error('Usage: node scripts/checkSmsMessage.js <messageId>');
    process.exit(1);
  }

  const username = process.env.ANDROID_SMS_GATEWAY_USERNAME;
  const password = process.env.ANDROID_SMS_GATEWAY_PASSWORD;
  const baseUrl = (process.env.ANDROID_SMS_GATEWAY_URL || 'https://api.sms-gate.app').replace(/\/3rdparty\/.+$/i, '');

  if (!username || !password) {
    console.error('ANDROID_SMS_GATEWAY_USERNAME or PASSWORD not set in .env');
    process.exit(2);
  }

  try {
    const tokenResp = await axios.post(
      `${baseUrl}/3rdparty/v1/auth/token`,
      { ttl: 3600, scopes: ['messages:read', 'messages:send', 'devices:list'] },
      {
        auth: { username, password },
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000,
      }
    );

    const token = tokenResp.data.access_token || tokenResp.data.accessToken || tokenResp.data.token;
    if (!token) {
      console.error('No token received:', tokenResp.data);
      process.exit(3);
    }

    const msgResp = await axios.get(`${baseUrl}/3rdparty/v1/messages/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 15000,
    });

    console.log('MESSAGE_STATUS:', JSON.stringify(msgResp.data, null, 2));
  } catch (err) {
    if (err.response) {
      console.error('HTTP=', err.response.status, err.response.data);
    } else {
      console.error(err.message);
    }
    process.exit(4);
  }
}

main();
