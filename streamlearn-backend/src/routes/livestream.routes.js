const router = require('express').Router();
const ctrl = require('../controllers/livestream.controller');
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');
const { isCreator, isAdmin } = require('../middleware/admin.middleware');

router.get('/', optionalAuth, ctrl.getAll);
router.get('/:id', optionalAuth, ctrl.getOne);
router.get('/:id/stream-url', authenticate, ctrl.getHLSUrl);
router.post('/admin/create', authenticate, isCreator, ctrl.create);
router.put('/admin/:id', authenticate, isCreator, ctrl.update);
router.delete('/admin/:id', authenticate, isCreator, ctrl.remove);
router.post('/admin/:id/start', authenticate, isCreator, ctrl.startStream);
router.post('/admin/:id/end', authenticate, isCreator, ctrl.endStream);
router.post('/admin/:id/poll', authenticate, isCreator, ctrl.createPoll);
router.get('/admin/:id/analytics', authenticate, isAdmin, ctrl.getAnalytics);

module.exports = router;
