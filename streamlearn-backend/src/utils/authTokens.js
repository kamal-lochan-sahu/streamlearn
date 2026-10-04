const crypto = require('crypto');

const sha256 = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');

const safeEqualHex = (a, b) => {
  const ba = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
};

const isProd = () => process.env.NODE_ENV === 'production';

/**
 * Cookie options for the refresh-token cookie.
 * - dev: SameSite=Lax (frontend + backend are both on localhost)
 * - prod: SameSite=None; Secure, so a frontend on another domain can still use it.
 *   Override with COOKIE_SAMESITE=lax|strict|none (use lax when API and app share a site).
 */
const refreshCookieOptions = () => {
  const configured = (process.env.COOKIE_SAMESITE || '').toLowerCase();
  const sameSite = ['lax', 'strict', 'none'].includes(configured)
    ? configured
    : isProd()
      ? 'none'
      : 'lax';
  return {
    httpOnly: true,
    secure: isProd() || sameSite === 'none',
    sameSite,
    path: '/api/auth',
  };
};

const REFRESH_COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

/** Cryptographically secure 6 digit code. */
const generateOTP = () => String(crypto.randomInt(100000, 1000000));

/** Short random token (for one-time codes, OAuth state). */
const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('hex');

module.exports = {
  sha256,
  safeEqualHex,
  refreshCookieOptions,
  REFRESH_COOKIE_MAX_AGE,
  generateOTP,
  randomToken,
};
