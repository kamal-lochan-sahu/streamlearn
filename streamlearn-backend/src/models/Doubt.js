const mongoose = require('mongoose');

const doubtSchema = new mongoose.Schema(
  {
    contentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Content', required: true },
    lectureId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lecture' },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    question: { type: String, required: true },
    timestamp: Number,
    attachment: String,
    answers: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        answer: String,
        isInstructor: { type: Boolean, default: false },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    isResolved: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Doubt', doubtSchema);
