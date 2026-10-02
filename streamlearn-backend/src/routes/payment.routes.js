const router = require('express').Router();
const ctrl = require('../controllers/payment.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { isAdmin } = require('../middleware/admin.middleware');

// Webhooks: raw body parsers are mounted in app.js BEFORE express.json(),
// otherwise signature verification cannot work.
router.post('/razorpay/webhook', ctrl.razorpayWebhook);
router.post('/stripe/webhook', ctrl.stripeWebhook);

router.post('/razorpay/create-order', authenticate, ctrl.createRazorpayOrder);
router.post('/razorpay/verify', authenticate, ctrl.verifyRazorpay);
router.post('/stripe/create-intent', authenticate, ctrl.createStripeIntent);
router.post('/ppv/:contentId', authenticate, ctrl.buyPPV);
router.get('/history', authenticate, ctrl.getHistory);
router.get('/admin/all', authenticate, isAdmin, ctrl.getAllHistory);

module.exports = router;
