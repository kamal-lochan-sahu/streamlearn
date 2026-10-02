const mongoose = require('mongoose');

const episodeSchema = new mongoose.Schema(
  {
    contentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Content', required: true },
    seasonNumber: { type: Number, required: true },
    episodeNumber: { type: Number, required: true },
    title: { type: String, required: true },
    description: String,
    thumbnail: String,
    duration: Number,
    videoFiles: { master: String, '480p': String, '720p': String, '1080p': String },
    subtitles: [{ language: String, label: String, url: String }],
    intro: { start: Number, end: Number },
    recap: { start: Number, end: Number },
    isActive: { type: Boolean, default: false },
    transcodeStatus: {
      type: String,
      enum: ['pending', 'processing', 'done', 'failed'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

episodeSchema.index({ contentId: 1, seasonNumber: 1, episodeNumber: 1 });

module.exports = mongoose.model('Episode', episodeSchema);
