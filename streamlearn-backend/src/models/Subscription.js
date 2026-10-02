const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'Plan', required: true },
    status: { type: String, enum: ['active', 'paused', 'cancelled', 'expired'], default: 'active' },
    billingCycle: { type: String, enum: ['monthly', 'yearly', 'lifetime'], required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    autoRenew: { type: Boolean, default: true },
    paymentMethod: String,
    transactionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
    cancelledAt: Date,
    cancelReason: String,
    pausedAt: Date,
  },
  { timestamps: true }
);

subscriptionSchema.index({ userId: 1, status: 1 });
subscriptionSchema.index({ endDate: 1 });

module.exports = mongoose.model('Subscription', subscriptionSchema);
