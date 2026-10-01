const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code:          { type: String, required: true, unique: true, uppercase: true },
  description:   String,
  type:          { type: String, enum: ['percent','fixed','free_trial'], required: true },
  value:         { type: Number, required: true },
  maxDiscount:   Number,
  usageLimit:    { type: Number, default: 0 },
  usageCount:    { type: Number, default: 0 },
  perUserLimit:  { type: Number, default: 1 },
  applicableFor: { type: String, enum: ['all','plan','content'], default: 'all' },
  planIds:       [mongoose.Schema.Types.ObjectId],
  contentIds:    [mongoose.Schema.Types.ObjectId],
  startDate:     Date,
  endDate:       Date,
  isActive:      { type: Boolean, default: true },
  usedBy:        [{ userId: mongoose.Schema.Types.ObjectId, usedAt: Date }],
}, { timestamps: true });

module.exports = mongoose.model('Coupon', couponSchema);
