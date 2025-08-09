const crypto = require('crypto');

const OTP_TTL_MIN = 5;        // OTP valid for 5 minutes
const RESEND_COOLDOWN_SEC = 30;
const MAX_ATTEMPTS = 5;
const OTP_SECRET = process.env.OTP_SECRET || 'change-me-super-secret';

function normalize10Digit(number) {
  const digits = String(number || '').replace(/\D/g, '');
  // take last 10 digits (India style)
  return digits.slice(-10);
}

function hashOtp(number10, code) {
  return crypto
    .createHmac('sha256', OTP_SECRET)
    .update(`${number10}:${code}`)
    .digest('hex');
}

function nowStr() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

module.exports = {
  OTP_TTL_MIN,
  RESEND_COOLDOWN_SEC,
  MAX_ATTEMPTS,
  normalize10Digit,
  hashOtp,
  nowStr
};
