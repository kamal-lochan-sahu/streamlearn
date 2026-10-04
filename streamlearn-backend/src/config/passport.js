const { Strategy: GoogleStrategy } = require('passport-google-oauth20');
const { Strategy: JwtStrategy, ExtractJwt } = require('passport-jwt');
const User = require('../models/User');
const { randomToken } = require('../utils/authTokens');

const googleConfigured = () =>
  Boolean(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_CALLBACK_URL
  );

/**
 * Finds or creates the user for a Google profile.
 * Exported separately so it can be tested without talking to Google.
 */
const googleVerify = async (accessToken, refreshToken, profile, done) => {
  try {
    const entry = profile.emails && profile.emails[0];
    const email = entry && typeof entry.value === 'string' ? entry.value.toLowerCase() : '';
    // Google says the address is NOT verified -> never trust it for account linking.
    if (!email || entry.verified === false || entry.verified === 'false') return done(null, false);

    let user = await User.findOne({ googleId: profile.id });
    if (!user) user = await User.findOne({ email });

    if (user) {
      if (!user.isActive) return done(null, false);
      if (!user.googleId) {
        user.googleId = profile.id;
        if (!user.isVerified) {
          // This local account was created with an email nobody verified. Whoever registered it
          // may not own the mailbox, so remove their password and sessions before linking Google.
          user.password = randomToken(24);
          user.refreshToken = undefined;
          user.isVerified = true;
        }
        if (!user.avatar && profile.photos && profile.photos[0])
          user.avatar = profile.photos[0].value;
        await user.save();
      }
      return done(null, user);
    }

    user = await User.create({
      name: profile.displayName || email.split('@')[0],
      email,
      avatar: (profile.photos && profile.photos[0] && profile.photos[0].value) || '',
      googleId: profile.id,
      isVerified: true,
      password: randomToken(24), // Google-only account: nobody knows this password
    });
    return done(null, user);
  } catch (err) {
    return done(err, false);
  }
};

module.exports = (passport) => {
  // JWT
  passport.use(
    new JwtStrategy(
      {
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: process.env.JWT_SECRET,
      },
      async (payload, done) => {
        try {
          const user = await User.findById(payload._id).select('-password -refreshToken');
          return user ? done(null, user) : done(null, false);
        } catch (err) {
          done(err, false);
        }
      }
    )
  );

  // Google OAuth: only registered when configured (the server must still boot without it)
  if (googleConfigured()) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: process.env.GOOGLE_CALLBACK_URL,
        },
        googleVerify
      )
    );
  }
};

module.exports.googleConfigured = googleConfigured;
module.exports.googleVerify = googleVerify;
