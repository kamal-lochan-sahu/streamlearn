const mongoose = require('mongoose');

const livePollSchema = new mongoose.Schema(
  {
    streamId: { type: mongoose.Schema.Types.ObjectId, ref: 'LiveStream', required: true },
    question: { type: String, required: true },
    options: [
      {
        text: String,
        votes: { type: Number, default: 0 },
        voters: [mongoose.Schema.Types.ObjectId],
      },
    ],
    isActive: { type: Boolean, default: true },
    endsAt: Date,
  },
  { timestamps: true }
);

module.exports = mongoose.model('LivePoll', livePollSchema);
