const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');

const profileSchema = new mongoose.Schema({
  name:        { type: String, required: true },
  avatar:      { type: String, default: '' },
  kidMode:     { type: Boolean, default: false },
  preferences: { genres: [String], languages: [String] },
  watchHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Content' }],
  continueWatching: [{
    contentId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Content' },
    episodeId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Episode' },
    lectureId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Lecture' },
    timestamp:  { type: Number, default: 0 },
    updatedAt:  { type: Date, default: Date.now },
  }],
}, { _id: true });

const userSchema = new mongoose.Schema({
  name:     { type: String, required: true, trim: true },
  email:    { type: String, required: true, unique: true, lowercase: true, trim: true },
  phone:    { type: String, default: '' },
  password: { type: String, required: true, minlength: 6 },
  avatar:   { type: String, default: '' },
  role:     { type: String, enum: ['owner','admin','creator','viewer'], default: 'viewer' },
  profiles: { type: [profileSchema], default: function() {
    return [{ name: this.name || 'Profile 1' }];
  }},
  activeProfile: { type: Number, default: 0 },
  subscription: {
    planId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Plan' },
    status:    { type: String, enum: ['active','paused','cancelled','expired','none'], default: 'none' },
    startDate: Date,
    endDate:   Date,
    autoRenew: { type: Boolean, default: true },
  },
  isVerified:    { type: Boolean, default: false },
  isActive:      { type: Boolean, default: true },
  otp:           { code: String, expiresAt: Date },
  refreshToken:  String,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  googleId:      String,
  lastLogin:     Date,
}, { timestamps: true });

// Hash password before save
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.toSafeObject = function() {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshToken;
  delete obj.otp;
  delete obj.resetPasswordToken;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
