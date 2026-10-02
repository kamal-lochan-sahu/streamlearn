const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const liveStreamSchema = new mongoose.Schema(
  {
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: String,
    thumbnail: String,
    streamKey: { type: String, default: () => uuidv4().replace(/-/g, '') },
    rtmpUrl: String,
    hlsUrl: String,
    status: { type: String, enum: ['scheduled', 'live', 'ended'], default: 'scheduled' },
    audience: { type: String, enum: ['all', 'subscribers', 'batch'], default: 'all' },
    batchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Content' },
    scheduledAt: Date,
    startedAt: Date,
    endedAt: Date,
    chatEnabled: { type: Boolean, default: true },
    pollEnabled: { type: Boolean, default: true },
    recordingEnabled: { type: Boolean, default: true },
    recordingUrl: String,
    peakViewers: { type: Number, default: 0 },
    totalViewers: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('LiveStream', liveStreamSchema);
