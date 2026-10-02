const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    contentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Content', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    title: String,
    body: String,
    helpful: { count: { type: Number, default: 0 }, users: [mongoose.Schema.Types.ObjectId] },
    isVerified: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

reviewSchema.index({ contentId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
