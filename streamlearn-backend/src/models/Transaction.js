const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  userId:           { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:             { type: String, enum: ['subscription','ppv','gift','refund'], required: true },
  planId:           { type: mongoose.Schema.Types.ObjectId, ref: 'Plan' },
  contentId:        { type: mongoose.Schema.Types.ObjectId, ref: 'Content' },
  gateway:          { type: String, enum: ['razorpay','stripe','manual'] },
  gatewayOrderId:   String,
  gatewayPaymentId: String,
  amount:           { type: Number, required: true },
  currency:         { type: String, default: 'INR' },
  gstAmount:        { type: Number, default: 0 },
  couponCode:       String,
  discountAmount:   { type: Number, default: 0 },
  status:           { type: String, enum: ['pending','success','failed','refunded'], default: 'pending' },
  invoiceUrl:       String,
  metadata:         mongoose.Schema.Types.Mixed,
}, { timestamps: true });

transactionSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Transaction', transactionSchema);
