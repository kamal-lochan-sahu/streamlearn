const Subscription = require('../models/Subscription');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

const BILLING_CYCLES = ['monthly', 'yearly', 'lifetime'];

const endDateFor = (billingCycle, from = new Date()) => {
  const end = new Date(from);
  if (billingCycle === 'monthly') end.setMonth(end.getMonth() + 1);
  else if (billingCycle === 'yearly') end.setFullYear(end.getFullYear() + 1);
  else if (billingCycle === 'lifetime') end.setFullYear(end.getFullYear() + 99);
  else throw new Error(`Unknown billing cycle: ${billingCycle}`);
  return end;
};

/**
 * Activates a subscription for a paid transaction. Idempotent: the same
 * transaction can never create two subscriptions (webhook + verify can race).
 */
const activateSubscription = async ({ userId, planId, billingCycle, transactionId, gateway }) => {
  const existing = await Subscription.findOne({ transactionId });
  if (existing) return existing;

  const now = new Date();
  const end = endDateFor(billingCycle, now);

  await Subscription.updateMany({ userId, status: 'active' }, { status: 'cancelled' });

  let sub;
  try {
    sub = await Subscription.create({
      userId,
      planId,
      billingCycle,
      status: 'active',
      startDate: now,
      endDate: end,
      transactionId,
      paymentMethod: gateway,
    });
  } catch (err) {
    // Lost the race against a parallel call for the same transaction.
    if (err.code === 11000) return Subscription.findOne({ transactionId });
    throw err;
  }

  await User.findByIdAndUpdate(userId, {
    subscription: { planId, status: 'active', startDate: now, endDate: end, autoRenew: true },
  });
  return sub;
};

/** True if the user has a successful PPV purchase for this content. */
const hasPurchasedContent = async (userId, contentId) => {
  const txn = await Transaction.exists({
    userId,
    contentId,
    type: 'ppv',
    status: 'success',
  });
  return Boolean(txn);
};

module.exports = { BILLING_CYCLES, endDateFor, activateSubscription, hasPurchasedContent };
