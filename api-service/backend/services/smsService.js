import { normalizeMexicanPhone } from '../utils/phoneValidation.js';

export const sendConsignmentReviewSms = async ({ name, phone }) => {
  const { TWILIO_ACCOUNT_SID: accountSid, TWILIO_AUTH_TOKEN: authToken, TWILIO_PHONE_NUMBER: from } = process.env;
  if (!accountSid || !authToken || !from) return { status: 'no_configurado' };

  const to = normalizeMexicanPhone(phone);
  if (!to) return { status: 'error', reason: 'invalid_phone' };

  const body = `Hola ${String(name).trim().slice(0, 90)}, la solicitud de venta de tu propiedad está siendo revisada por un administrador.`;
  const endpoint = `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(accountSid)}/Messages.json`;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({ To: to, From: from, Body: body }),
    signal: AbortSignal.timeout(12000)
  });

  if (!response.ok) {
    const responseBody = await response.json().catch(() => ({}));
    console.error('[SMS] Twilio rechazó el mensaje:', response.status, responseBody.code || 'sin código');
    return { status: 'error', reason: 'provider_error' };
  }

  return { status: 'enviado' };
};
