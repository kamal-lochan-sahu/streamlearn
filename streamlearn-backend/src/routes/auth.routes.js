const router = require('express').Router();
const passport = require('passport');
const ctrl = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const {
  loginLimiter,
  registerLimiter,
  otpLimiter,
  verifyLimiter,
} = require('../middleware/rateLimit.middleware');
const { googleConfigured } = require('../config/passport');
const { randomToken, safeEqualHex, refreshCookieOptions } = require('../utils/authTokens');

router.post('/register', registerLimiter, ctrl.register);
router.post('/login', loginLimiter, ctrl.login);
router.post('/logout', ctrl.logout);
router.post('/refresh-token', verifyLimiter, ctrl.refreshToken);
router.post('/send-otp', otpLimiter, ctrl.sendOTP);
router.post('/verify-otp', verifyLimiter, ctrl.verifyOTP);
router.post('/forgot-password', otpLimiter, ctrl.forgotPassword);
router.post('/reset-password/:token', verifyLimiter, ctrl.resetPassword);
router.post('/change-password', verifyLimiter, authenticate, ctrl.changePassword);

// ── Google OAuth
const STATE_COOKIE = 'oauth_state';
const stateCookieOptions = () => ({
  httpOnly: true,
  secure: refreshCookieOptions().secure,
  sameSite: 'lax', // must survive the top-level redirect back from Google
  path: '/api/auth/google',
});
const clientLoginError = () =>
  `${(process.env.CLIENT_URL || '').replace(/\/+$/, '')}/login?error=google_failed`;

const requireGoogle = (req, res, next) =>
  googleConfigured()
    ? next()
    : res.status(503).json({ success: false, message: 'Google login is not configured' });

router.get('/google', requireGoogle, (req, res, next) => {
  // `state` ties the callback to the browser that started the login (login-CSRF protection)
  const state = randomToken(16);
  res.cookie(STATE_COOKIE, state, { ...stateCookieOptions(), maxAge: 10 * 60 * 1000 });
  passport.authenticate('google', { scope: ['profile', 'email'], session: false, state })(
    req,
    res,
    next
  );
});

router.get(
  '/google/callback',
  requireGoogle,
  (req, res, next) => {
    const expected = req.cookies?.[STATE_COOKIE];
    res.clearCookie(STATE_COOKIE, stateCookieOptions());
    if (
      !expected ||
      typeof req.query.state !== 'string' ||
      !safeEqualHex(expected, req.query.state)
    )
      return res.redirect(clientLoginError());
    next();
  },
  (req, res, next) => {
    passport.authenticate('google', { session: false }, (err, user) => {
      if (err || !user) return res.redirect(clientLoginError());
      req.user = user;
      next();
    })(req, res, next);
  },
  ctrl.googleCallback
);

router.post('/google/exchange', verifyLimiter, ctrl.googleExchange);

module.exports = router;
