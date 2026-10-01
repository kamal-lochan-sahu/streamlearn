const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  userId:    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:      { type: String, enum: ['new_content','live_reminder','sub_expiry','system','welcome','payment'], required: true },
  title:     { type: String, required: true },
  message:   String,
  contentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Content' },
  streamId:  { type: mongoose.Schema.Types.ObjectId, ref: 'LiveStream' },
  channel:   { type: String, enum: ['inapp','email','push','whatsapp'], default: 'inapp' },
  isRead:    { type: Boolean, default: false },
  actionUrl: String,
}, { timestamps: true });

notificationSchema.index({ userId: 1, isRead: 1 });

module.exports = mongoose.model('Notification', notificationSchema);
