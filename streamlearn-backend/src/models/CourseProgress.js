const mongoose = require('mongoose');

const courseProgressSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    contentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Content', required: true },
    completedLectures: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lecture' }],
    completionPercent: { type: Number, default: 0, min: 0, max: 100 },
    lastLecture: { type: mongoose.Schema.Types.ObjectId, ref: 'Lecture' },
    lastTimestamp: { type: Number, default: 0 },
    quizScores: [
      { lectureId: mongoose.Schema.Types.ObjectId, score: Number, total: Number, takenAt: Date },
    ],
    certificateIssued: { type: Boolean, default: false },
    certificateUrl: String,
    enrolledAt: { type: Date, default: Date.now },
    completedAt: Date,
  },
  { timestamps: true }
);

courseProgressSchema.index({ userId: 1, contentId: 1 }, { unique: true });

module.exports = mongoose.model('CourseProgress', courseProgressSchema);
