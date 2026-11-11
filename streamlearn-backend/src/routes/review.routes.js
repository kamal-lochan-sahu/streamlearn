const router = require('express').Router();
const ctrl = require('../controllers/review.controller');
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');
const { isAdmin } = require('../middleware/admin.middleware');

router.post('/', authenticate, ctrl.create);
router.get('/admin/all', authenticate, isAdmin, ctrl.adminList);
router.put('/admin/:id/visibility', authenticate, isAdmin, ctrl.setVisibility);
router.get('/content/:contentId', optionalAuth, ctrl.getByContent);
router.put('/:id', authenticate, ctrl.update);
router.delete('/:id', authenticate, ctrl.remove);
router.post('/:id/helpful', authenticate, ctrl.markHelpful);

module.exports = router;
