const mongoose = require('mongoose');
const { hideTranscodeInternals } = require('../utils/schema.utils');

const lectureSchema = new mongoose.Schema(
  {
    contentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Content', required: true },
    sectionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Section', required: true },
    order: { type: Number, required: true },
    title: { type: String, required: true },
    description: String,
    type: { type: String, enum: ['video', 'pdf', 'quiz', 'assignment', 'text'], default: 'video' },
    duration: Number,
    videoFiles: { master: String, '480p': String, '720p': String, '1080p': String },
    chapters: [{ title: String, timestamp: Number }],
    notes: String,
    transcript: String,
    isFreePreview: { type: Boolean, default: false },
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

// Internal transcode details (job id, failure reason) never leave the server in a JSON response.
hideTranscodeInternals(lectureSchema);

module.exports = mongoose.model('Lecture', lectureSchema);
