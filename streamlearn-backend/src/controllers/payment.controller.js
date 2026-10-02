const crypto = require('crypto');
const Razorpay = require('../config/razorpay');
const Stripe = require('../config/stripe');
const Transaction = require('../models/Transaction');
const Plan = require('../models/Plan');
const Content = require('../models/Content');
const { ApiError } = require('../utils/ApiError');
const { ApiResponse } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');

// ── Razorpay: create order ────────────────────────────
exports.createRazorpayOrder = asyncHandler(async (req, res) => {
  const { planId, billingCycle = 'monthly', couponCode } = req.body;
  if (!planId) throw new ApiError(400, 'planId required');

  const plan = await Plan.findById(planId);
  if (!plan) throw new ApiError(404, 'Plan not found');

  let amount = plan.price[billingCycle] || plan.price.monthly;

  // Apply coupon
  if (couponCode) {
    const Coupon = require('../models/Coupon');
    const coupon = await Coupon.findOne({ code: couponCode.toUpperCase(), isActive: true });
    if (coupon && new Date() <= coupon.endDate) {
      if (coupon.type === 'percent') amount = amount * (1 - coupon.value / 100);
      if (coupon.type === 'fixed') amount = Math.max(0, amount - coupon.value);
    }
  }

  const order = await Razorpay.orders.create({
    amount: Math.round(amount * 100), // paise
    currency: 'INR',
    receipt: `rcpt_${Date.now()}`,
    notes: { planId, billingCycle, userId: req.user._id.toString() },
  });

  // Create pending transaction
  await Transaction.create({
    userId: req.user._id,
    type: 'subscription',
    planId,
    gateway: 'razorpay',
    gatewayOrderId: order.id,
    amount,
    currency: 'INR',
    status: 'pending',
  });

  res.json(
    new ApiResponse(200, {
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    })
  );
});

// ── Razorpay: verify payment ──────────────────────────
exports.verifyRazorpay = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');

  if (expectedSignature !== razorpay_signature)
    throw new ApiError(400, 'Invalid payment signature');

  const txn = await Transaction.findOneAndUpdate(
    { gatewayOrderId: razorpay_order_id },
    { gatewayPaymentId: razorpay_payment_id, status: 'success' },
    { new: true }
  );
  if (!txn) throw new ApiError(404, 'Transaction not found');

  // Activate subscription
  const { subscribe } = require('./subscription.controller');
  req.body = { planId: txn.planId, billingCycle: 'monthly', transactionId: txn._id };
  await subscribe(req, res);
});

// ── Razorpay webhook ──────────────────────────────────
exports.razorpayWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const expectedSig = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');
  if (signature !== expectedSig) return res.status(400).json({ message: 'Invalid signature' });

  const event = req.body.event;
  if (event === 'payment.captured') {
    const { order_id, id: payment_id } = req.body.payload.payment.entity;
    await Transaction.findOneAndUpdate(
      { gatewayOrderId: order_id },
      { gatewayPaymentId: payment_id, status: 'success' }
    );
  }
  res.json({ received: true });
});

// ── Stripe: create payment intent ────────────────────
exports.createStripeIntent = asyncHandler(async (req, res) => {
  const { planId, billingCycle = 'monthly' } = req.body;
  const plan = await Plan.findById(planId);
  if (!plan) throw new ApiError(404, 'Plan not found');
  const amount = plan.price[billingCycle] || plan.price.monthly;

  const intent = await Stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: 'usd',
    metadata: { planId, billingCycle, userId: req.user._id.toString() },
  });

  await Transaction.create({
    userId: req.user._id,
    type: 'subscription',
    planId,
    gateway: 'stripe',
    gatewayOrderId: intent.id,
    amount,
    currency: 'USD',
    status: 'pending',
  });

  res.json(new ApiResponse(200, { clientSecret: intent.client_secret }));
});

// ── Stripe webhook ────────────────────────────────────
exports.stripeWebhook = asyncHandler(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = Stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
  if (event.type === 'payment_intent.succeeded') {
    await Transaction.findOneAndUpdate(
      { gatewayOrderId: event.data.object.id },
      { status: 'success', gatewayPaymentId: event.data.object.id }
    );
  }
  res.json({ received: true });
});

// ── Buy PPV content ───────────────────────────────────
exports.buyPPV = asyncHandler(async (req, res) => {
  const content = await Content.findById(req.params.contentId);
  if (!content) throw new ApiError(404, 'Content not found');
  if (content.access !== 'ppv') throw new ApiError(400, 'Not a PPV content');

  const order = await Razorpay.orders.create({
    amount: Math.round(content.price * 100),
    currency: 'INR',
    receipt: `ppv_${Date.now()}`,
    notes: { contentId: content._id.toString(), userId: req.user._id.toString() },
  });

  await Transaction.create({
    userId: req.user._id,
    type: 'ppv',
    contentId: content._id,
    gateway: 'razorpay',
    gatewayOrderId: order.id,
    amount: content.price,
    currency: 'INR',
    status: 'pending',
  });

  res.json(
    new ApiResponse(200, {
      orderId: order.id,
      amount: order.amount,
      keyId: process.env.RAZORPAY_KEY_ID,
    })
  );
});

// ── Payment history ───────────────────────────────────
exports.getHistory = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const txns = await Transaction.find({ userId: req.user._id })
    .populate('planId', 'name')
    .populate('contentId', 'title')
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(parseInt(limit));
  res.json(new ApiResponse(200, txns));
});

exports.getAll = exports.getHistory;
exports.getOne = asyncHandler(async (req, res) => res.json(new ApiResponse(200, {})));
exports.create = asyncHandler(async (req, res) => res.json(new ApiResponse(200, {})));
exports.update = asyncHandler(async (req, res) => res.json(new ApiResponse(200, {})));
exports.remove = asyncHandler(async (req, res) => res.json(new ApiResponse(200, {})));
