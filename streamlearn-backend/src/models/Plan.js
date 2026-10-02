const mongoose = require('mongoose');

const planSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    description: String,
    price: {
      monthly: { type: Number, default: 0 },
      yearly: { type: Number, default: 0 },
      lifetime: { type: Number, default: 0 },
    },
    features: {
      maxProfiles: { type: Number, default: 1 },
      maxDownloads: { type: Number, default: 0 },
      quality: { type: String, enum: ['480p', '720p', '1080p', '4K'], default: '720p' },
      simultaneousStreams: { type: Number, default: 1 },
      downloadEnabled: { type: Boolean, default: false },
      liveAccess: { type: Boolean, default: false },
      adsEnabled: { type: Boolean, default: true },
      offlineAccess: { type: Boolean, default: false },
    },
    badge: String,
    isActive: { type: Boolean, default: true },
    isPopular: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Plan', planSchema);
