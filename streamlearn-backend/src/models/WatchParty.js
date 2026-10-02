const mongoose = require('mongoose');

const watchPartySchema = new mongoose.Schema(
  {
    hostId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    contentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Content', required: true },
    episodeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Episode' },
    code: { type: String, required: true, unique: true },
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    status: { type: String, enum: ['waiting', 'active', 'ended'], default: 'waiting' },
    currentTimestamp: { type: Number, default: 0 },
    isPlaying: { type: Boolean, default: false },
    chat: [
      {
        userId: mongoose.Schema.Types.ObjectId,
        name: String,
        message: String,
        time: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('WatchParty', watchPartySchema);
