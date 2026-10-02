const crypto = require('crypto');
const Razorpay = require('../config/razorpay');
const Stripe = require('../config/stripe');
const Transaction = require('../models/Transaction');
const Plan = require('../models/Plan');
const Content = require('../models/Content');
const { evaluateCoupon, redeemCoupon, round2 } = require('../services/coupon.service');
const { BILLING_CYCLES, activateSubscription } = require('../services/subscription.service');
const { ApiError } = require('../utils/ApiError');
const { ApiResponse } = require('../utils/ApiResponse');
const { asyncHandler } = require('../utils/asyncHandler');

const safeEqual = (a, b) => {
  const ba = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
};

/** Price (rupees) for a plan + cycle, straight from the DB. Never from the client. */
const priceFor = (plan, billingCycle) => {
  if (!BILLING_CYCLES.includes(billingCycle)) throw new ApiError(400, 'Invalid billing cycle');
  const price = plan.price?.[billingCycle];
  if (!(price > 0)) throw new ApiError(400, 'This billing cycle is not available for this plan');
  return price;
};

const loadPlan = async (planId) => {
  const plan = await Plan.findById(planId);
  if (!plan || !plan.isActive) throw new ApiError(404, 'Plan not found');
  return plan;
};

/**
 * Marks a transaction as paid and delivers what was bought. Safe to call many
 * times for the same transaction (verify + webhook + webhook retries).
 */
const fulfillTransaction = async (txn, gatewayPaymentId) => {
  // Claim the pending -> success transition exactly once (coupon is redeemed only then).
  const claimed = await Transaction.findOneAndUpdate(
    { _id: txn._id, status: { $ne: 'success' } },
    { status: 'success', gatewayPaymentId },
    { new: true }
  );
  if (claimed && claimed.couponCode) {
    await redeemCoupon(claimed.couponCode, claimed.userId).catch((e) =>
      console.error('Coupon redeem failed:', e.message)
    );
  }

  const current = claimed || txn;
  if (current.type === 'subscription') {
    return activateSubscription({
      userId: current.userId,
      planId: current.planId,
      billingCycle: current.billingCycle,
      transactionId: current._id,
      gateway: current.gateway,
    });
  }
  // PPV: the successful transaction itself is the access grant (see hasPurchasedContent).
  return null;
};

// ── Razorpay: create order ────────────────────────────
exports.createRazorpayOrder = asyncHandler(async (req, res) => {
  const { planId, billingCycle = 'monthly', couponCode } = req.body;
  if (!planId) throw new ApiError(400, 'planId required');

  const plan = await loadPlan(planId);
  const baseAmount = priceFor(plan, billingCycle);

  let amount = baseAmount;
  let discountAmount = 0;
  let appliedCoupon;
  if (couponCode) {
    const result = await evaluateCoupon({
      code: couponCode,
      userId: req.user._id,
      planId: plan._id,
      amount: baseAmount,
    });
    amount = result.finalAmount;
    discountAmount = result.discount;
    appliedCoupon = result.coupon.code;
  }
  if (amount < 1) throw new ApiError(400, 'Final amount is below the minimum payable amount');

  const order = await Razorpay.orders.create({
    amount: Math.round(amount * 100), // paise
    currency: 'INR',
    receipt: `rcpt_${Date.now()}`,
    notes: { planId: String(plan._id), billingCycle, userId: req.user._id.toString() },
  });

  await Transaction.create({
    userId: req.user._id,
    type: 'subscription',
    planId: plan._id,
    billingCycle,
    gateway: 'razorpay',
    gatewayOrderId: order.id,
    amount,
    currency: 'INR',
    couponCode: appliedCoupon,
    discountAmount,
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

// ── Razorpay: verify payment (called by the browser after checkout) ──
exports.verifyRazorpay = asyncHandler(async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature)
    throw new ApiError(400, 'Payment details missing');

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest('hex');
  if (!safeEqual(expectedSignature, razorpay_signature))
    throw new ApiError(400, 'Invalid payment signature');

  // Only the user who created the order can verify it.
  const txn = await Transaction.findOne({
    gateway: 'razorpay',
    gatewayOrderId: razorpay_order_id,
    userId: req.user._id,
  });
  if (!txn) throw new ApiError(404, 'Transaction not found');

  const sub = await fulfillTransaction(txn, razorpay_payment_id);
  res.json(new ApiResponse(200, sub, 'Payment verified'));
});

// ── Razorpay webhook (raw body is mounted in app.js) ──
exports.razorpayWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers['x-razorpay-signature'];
  const raw = Buffer.isBuffer(req.body) ? req.body : null;
  if (!raw || !process.env.RAZORPAY_WEBHOOK_SECRET)
    return res.status(400).json({ message: 'Invalid request' });

  const expectedSig = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(raw)
    .digest('hex');
  if (!safeEqual(signature, expectedSig))
    return res.status(400).json({ message: 'Invalid signature' });

  const body = JSON.parse(raw.toString('utf8'));
  const entity = body.payload?.payment?.entity;

  if (body.event === 'payment.captured' && entity) {
    const txn = await Transaction.findOne({ gateway: 'razorpay', gatewayOrderId: entity.order_id });
    if (txn) await fulfillTransaction(txn, entity.id);
  } else if (body.event === 'payment.failed' && entity) {
    await Transaction.updateOne(
      { gateway: 'razorpay', gatewayOrderId: entity.order_id, status: 'pending' },
      { status: 'failed' }
    );
  }
  res.json({ received: true });
});

// ── Stripe: create payment intent ────────────────────
exports.createStripeIntent = asyncHandler(async (req, res) => {
  const { planId, billingCycle = 'monthly' } = req.body;
  if (!planId) throw new ApiError(400, 'planId required');

  const plan = await loadPlan(planId);
  const amount = priceFor(plan, billingCycle);
  const currency = (process.env.STRIPE_CURRENCY || 'inr').toLowerCase();

  const intent = await Stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency,
    metadata: { planId: String(plan._id), billingCycle, userId: req.user._id.toString() },
  });

  await Transaction.create({
    userId: req.user._id,
    type: 'subscription',
    planId: plan._id,
    billingCycle,
    gateway: 'stripe',
    gatewayOrderId: intent.id,
    amount: round2(amount),
    currency: currency.toUpperCase(),
    status: 'pending',
  });

  res.json(new ApiResponse(200, { clientSecret: intent.client_secret }));
});

// ── Stripe webhook (raw body is mounted in app.js) ───
exports.stripeWebhook = asyncHandler(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = Stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object;
    const txn = await Transaction.findOne({ gateway: 'stripe', gatewayOrderId: intent.id });
    if (txn) await fulfillTransaction(txn, intent.id);
  } else if (event.type === 'payment_intent.payment_failed') {
    await Transaction.updateOne(
      { gateway: 'stripe', gatewayOrderId: event.data.object.id, status: 'pending' },
      { status: 'failed' }
    );
  }
  res.json({ received: true });
});

// ── Buy PPV content ───────────────────────────────────
exports.buyPPV = asyncHandler(async (req, res) => {
  const content = await Content.findById(req.params.contentId);
  if (!content) throw new ApiError(404, 'Content not found');
  if (content.access !== 'ppv') throw new ApiError(400, 'Not a PPV content');
  if (!(content.price >= 1)) throw new ApiError(400, 'Content price is not set');

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
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    })
  );
});

// ── Payment history ───────────────────────────────────
// Admins get all users' transactions via /history/all; everyone else only their own.
const listTransactions = async (filter, query) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 100);
  return Transaction.find(filter)
    .populate('planId', 'name')
    .populate('contentId', 'title')
    .sort('-createdAt')
    .skip((page - 1) * limit)
    .limit(limit);
};

exports.getHistory = asyncHandler(async (req, res) => {
  res.json(new ApiResponse(200, await listTransactions({ userId: req.user._id }, req.query)));
});

exports.getAllHistory = asyncHandler(async (req, res) => {
  const filter = {};
  if (typeof req.query.status === 'string') filter.status = req.query.status;
  res.json(new ApiResponse(200, await listTransactions(filter, req.query)));
});
