const router = require('express').Router();
const ctrl = require('../controllers/episode.controller');
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');
const { isCreator, isAdmin } = require('../middleware/admin.middleware');

router.get('/content/:contentId', optionalAuth, ctrl.getByContent);
router.get('/:id/stream', authenticate, ctrl.getStreamUrl);
router.post('/admin/create', authenticate, isCreator, ctrl.create);
router.put('/admin/:id', authenticate, isCreator, ctrl.update);
router.delete('/admin/:id', authenticate, isAdmin, ctrl.remove);
router.post('/admin/:id/upload', authenticate, isCreator, ctrl.uploadMiddleware, ctrl.uploadVideo);
router.get('/:id', optionalAuth, ctrl.getByContent);

module.exports = router;
