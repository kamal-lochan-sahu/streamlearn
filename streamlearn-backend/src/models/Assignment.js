const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema(
  {
    lectureId: { type: mongoose.Schema.Types.ObjectId, ref: 'Lecture', required: true },
    contentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Content', required: true },
    title: { type: String, required: true },
    description: String,
    dueDate: Date,
    maxScore: { type: Number, default: 100 },
    submissions: [
      {
        userId: mongoose.Schema.Types.ObjectId,
        content: String,
        attachments: [String],
        submittedAt: { type: Date, default: Date.now },
        score: Number,
        feedback: String,
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Assignment', assignmentSchema);
