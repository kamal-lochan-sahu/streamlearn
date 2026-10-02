const router = require('express').Router();
const ctrl = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { authLimiter } = require('../middleware/rateLimit.middleware');
const passport = require('passport');

router.post('/register', authLimiter, ctrl.register);
router.post('/login', authLimiter, ctrl.login);
router.post('/logout', authenticate, ctrl.logout);
router.post('/refresh-token', ctrl.refreshToken);
router.post('/send-otp', authLimiter, ctrl.sendOTP);
router.post('/verify-otp', ctrl.verifyOTP);
router.post('/forgot-password', authLimiter, ctrl.forgotPassword);
router.post('/reset-password/:token', ctrl.resetPassword);
router.post('/change-password', authenticate, ctrl.changePassword);
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);
router.get(
  '/google/callback',
  passport.authenticate('google', { session: false }),
  ctrl.googleCallback
);

module.exports = router;
