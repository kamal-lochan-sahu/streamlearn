const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema({
  ownerId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type:      { type: String, enum: ['movie','series','course','documentary','short','music'], required: true },
  title:     { type: String, required: true, trim: true },
  slug:      { type: String, unique: true, lowercase: true },
  description: String,
  shortDesc:   String,
  thumbnail:   String,
  banner:      String,
  trailer: { url: String, duration: Number },

  // OTT fields
  cast: [{ name: String, role: String, photo: String, character: String }],
  crew: [{ name: String, role: String }],
  genre:       [String],
  language:    [String],
  releaseYear: Number,
  duration:    Number,
  ageRating:   { type: String, enum: ['U','U/A 7+','U/A 13+','U/A 16+','A'], default: 'U' },
  country:     [String],
  awards:      [String],
  imdbRating:  Number,

  // Education fields
  instructor:   { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  skillLevel:   { type: String, enum: ['beginner','intermediate','advanced'] },
  whatYouLearn: [String],
  requirements: [String],
  totalLectures: { type: Number, default: 0 },
  totalDuration: { type: Number, default: 0 },

  // Monetization
  access: { type: String, enum: ['free','subscribers','ppv'], default: 'subscribers' },
  price:  { type: Number, default: 0 },

  // Video files (HLS)
  videoFiles: {
    master: String,
    '480p': String,
    '720p': String,
    '1080p': String,
    '4k':   String,
  },
  subtitles: [{ language: String, label: String, url: String }],
  audioTracks: [{ language: String, label: String, url: String }],

  // Intro/Recap markers
  intro: { start: Number, end: Number },
  recap: { start: Number, end: Number },

  // Stats
  viewCount: { type: Number, default: 0 },
  rating: { average: { type: Number, default: 0 }, count: { type: Number, default: 0 } },

  // Config
  geoBlock:       [String],
  schedulePublish: Date,
  expiryDate:     Date,
  isActive:       { type: Boolean, default: false },
  isFeatured:     { type: Boolean, default: false },
  transcodeStatus: { type: String, enum: ['pending','processing','done','failed'], default: 'pending' },

  // SEO
  metaTitle:       String,
  metaDescription: String,
  tags:            [String],
}, { timestamps: true });

contentSchema.index({ slug: 1 });
contentSchema.index({ type: 1, isActive: 1 });
contentSchema.index({ genre: 1 });
contentSchema.index({ tags: 1 });
contentSchema.index({ title: 'text', description: 'text', tags: 'text' });

module.exports = mongoose.model('Content', contentSchema);
