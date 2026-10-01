const mongoose = require('mongoose');

const liveChatSchema = new mongoose.Schema({
  streamId: { type: mongoose.Schema.Types.ObjectId, ref: 'LiveStream', required: true },
  userId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message:  { type: String, required: true, maxlength: 500 },
  type:     { type: String, enum: ['text','reaction','question','answer'], default: 'text' },
  isPinned: { type: Boolean, default: false },
  isDeleted:{ type: Boolean, default: false },
}, { timestamps: true });

liveChatSchema.index({ streamId: 1, createdAt: -1 });

module.exports = mongoose.model('LiveChat', liveChatSchema);
