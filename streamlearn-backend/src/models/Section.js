const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
  contentId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Content', required: true },
  order:       { type: Number, required: true },
  title:       { type: String, required: true },
  description: String,
  lectures:    [{ type: mongoose.Schema.Types.ObjectId, ref: 'Lecture' }],
}, { timestamps: true });

module.exports = mongoose.model('Section', sectionSchema);
