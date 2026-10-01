const router = require('express').Router();
const ctrl   = require('../controllers/content.controller');
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');
const { isAdmin, isCreator } = require('../middleware/admin.middleware');

// ── Static routes first (before :slug catches them) ──
router.get('/featured',          optionalAuth, ctrl.getFeatured);
router.get('/trending',          optionalAuth, ctrl.getTrending);
router.get('/new-releases',      optionalAuth, ctrl.getNewReleases);
router.post('/search',           optionalAuth, ctrl.search);
router.get('/search',            optionalAuth, ctrl.search);
router.get('/continue-watching', authenticate, ctrl.getContinueWatching);
router.get('/recommendations',   authenticate, ctrl.getRecommendations);

// ── Admin routes ──
router.post('/admin/create',           authenticate, isCreator, ctrl.create);
router.put('/admin/:id/toggle',        authenticate, isCreator, ctrl.toggle);
router.get('/admin/:id/analytics',     authenticate, isAdmin, ctrl.getAnalytics);
router.get('/admin/:id/transcode-status', authenticate, ctrl.getTranscodeStatus);
router.post('/admin/:id/upload',       authenticate, isCreator, ctrl.uploadMiddleware, ctrl.uploadVideo);
router.post('/admin/:id/thumbnail',    authenticate, isCreator, ctrl.imageUploadMiddleware, ctrl.uploadThumbnail);
router.put('/admin/:id',               authenticate, isCreator, ctrl.update);
router.delete('/admin/:id',            authenticate, isAdmin, ctrl.remove);

// ── Browse all ──
router.get('/', optionalAuth, ctrl.getAll);

// ── Dynamic :slug routes (LAST — order matters) ──
router.get('/:slug/episodes', optionalAuth, ctrl.getEpisodes);
router.get('/:slug/stream',   authenticate, ctrl.getStreamUrl);
router.get('/:id/related',    optionalAuth, ctrl.getRelated);
router.get('/:slug',          optionalAuth, ctrl.getBySlug);

module.exports = router;
