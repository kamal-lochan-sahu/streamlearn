const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    platform: {
      name: { type: String, default: 'StreamLearn' },
      logo: String,
      favicon: String,
      primaryColor: { type: String, default: '#e50914' },
      secondaryColor: { type: String, default: '#141414' },
      domain: String,
      tagline: String,
    },
    features: {
      ottMode: { type: Boolean, default: true },
      educationMode: { type: Boolean, default: true },
      liveStreaming: { type: Boolean, default: true },
      downloads: { type: Boolean, default: true },
      community: { type: Boolean, default: true },
      watchParty: { type: Boolean, default: true },
      dppSystem: { type: Boolean, default: true },
      certificate: { type: Boolean, default: true },
      ppv: { type: Boolean, default: true },
      subscription: { type: Boolean, default: true },
      freeContent: { type: Boolean, default: true },
      kidsProfile: { type: Boolean, default: false },
      multiLanguage: { type: Boolean, default: false },
      adsEnabled: { type: Boolean, default: false },
    },
    payment: {
      razorpayEnabled: { type: Boolean, default: true },
      stripeEnabled: { type: Boolean, default: false },
      currency: { type: String, default: 'INR' },
      gstEnabled: { type: Boolean, default: false },
      gstPercent: { type: Number, default: 18 },
    },
    streaming: {
      defaultQuality: { type: String, default: '720p' },
      maxQuality: { type: String, default: '1080p' },
      downloadExpiry: { type: Number, default: 30 },
      watermarkEnabled: { type: Boolean, default: true },
    },
    notifications: {
      subExpiryDays: { type: Number, default: 3 },
      newContentAlert: { type: Boolean, default: true },
      liveReminder: { type: Boolean, default: true },
      whatsappEnabled: { type: Boolean, default: false },
    },
    seo: {
      metaTitle: String,
      metaDescription: String,
      googleAnalyticsId: String,
      facebookPixel: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Settings', settingsSchema);
