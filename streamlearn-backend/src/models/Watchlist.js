const mongoose = require('mongoose');

const watchlistSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  profileIndex: { type: Number, default: 0 },
  items: [{
    contentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Content' },
    addedAt:   { type: Date, default: Date.now },
  }],
}, { timestamps: true });

watchlistSchema.index({ userId: 1, profileIndex: 1 });

module.exports = mongoose.model('Watchlist', watchlistSchema);
