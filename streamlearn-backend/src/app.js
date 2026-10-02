const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const passport = require('passport');
const { errorHandler } = require('./middleware/error.middleware');
const { globalLimiter } = require('./middleware/rateLimit.middleware');

const app = express();

// ── Security
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  })
);

// ── Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());
app.use(compression());

// ── Logging (dev only)
if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));

// ── Static — HLS segments served directly
app.use('/uploads', express.static('uploads'));

// ── Rate limiting
app.use('/api', globalLimiter);

// ── Passport
app.use(passport.initialize());
require('./config/passport')(passport);

// ── Routes
app.use('/api/auth', require('./routes/auth.routes'));
app.use('/api/users', require('./routes/user.routes'));
app.use('/api/content', require('./routes/content.routes'));
app.use('/api/episodes', require('./routes/episode.routes'));
app.use('/api/lectures', require('./routes/lecture.routes'));
app.use('/api/live', require('./routes/livestream.routes'));
app.use('/api/watchlist', require('./routes/watchlist.routes'));
app.use('/api/reviews', require('./routes/review.routes'));
app.use('/api/watchparty', require('./routes/watchparty.routes'));
app.use('/api/progress', require('./routes/progress.routes'));
app.use('/api/doubts', require('./routes/doubt.routes'));
app.use('/api/assignments', require('./routes/assignment.routes'));
app.use('/api/payments', require('./routes/payment.routes'));
app.use('/api/plans', require('./routes/plan.routes'));
app.use('/api/subscriptions', require('./routes/subscription.routes'));
app.use('/api/coupons', require('./routes/coupon.routes'));
app.use('/api/notifications', require('./routes/notification.routes'));
app.use('/api/analytics', require('./routes/analytics.routes'));
app.use('/api/settings', require('./routes/settings.routes'));
app.use('/api/search', require('./routes/search.routes'));
app.use('/api/upload', require('./routes/upload.routes'));

// ── Health
app.get('/health', (req, res) => res.json({ status: 'ok', ts: Date.now() }));

// ── 404
app.use('*', (req, res) => res.status(404).json({ success: false, message: 'Route not found' }));

// ── Global error handler
app.use(errorHandler);

module.exports = app;
