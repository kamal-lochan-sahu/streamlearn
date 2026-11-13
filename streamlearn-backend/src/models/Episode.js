const mongoose = require('mongoose');
const { hideTranscodeInternals } = require('../utils/schema.utils');

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
    // Server-only: which queue job is working on the video, and why the last one failed.
    // Never part of a JSON response (see toJSON below); admin screens read transcodeError explicitly.
    transcodeJobId: String,
    transcodeError: String,
  },
  { timestamps: true }
);

episodeSchema.index({ contentId: 1, seasonNumber: 1, episodeNumber: 1 });

// Internal transcode details (job id, failure reason) never leave the server in a JSON response.
hideTranscodeInternals(episodeSchema);

module.exports = mongoose.model('Episode', episodeSchema);
