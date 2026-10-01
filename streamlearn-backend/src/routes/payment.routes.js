const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/payment.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.post('/razorpay/create-order', authenticate, ctrl.createRazorpayOrder);
router.post('/razorpay/verify', authenticate, ctrl.verifyRazorpay);
router.post('/razorpay/webhook', express.raw({ type: 'application/json' }), ctrl.razorpayWebhook);
router.post('/stripe/create-intent', authenticate, ctrl.createStripeIntent);
router.post('/stripe/webhook', express.raw({ type: 'application/json' }), ctrl.stripeWebhook);
router.post('/ppv/:contentId', authenticate, ctrl.buyPPV);
router.get('/history', authenticate, ctrl.getHistory);

module.exports = router;
