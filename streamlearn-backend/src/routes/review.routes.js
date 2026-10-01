const router = require('express').Router();
const ctrl   = require('../controllers/review.controller');
const { authenticate, optionalAuth } = require('../middleware/auth.middleware');

router.post('/', authenticate, ctrl.create);
router.get('/content/:contentId', optionalAuth, ctrl.getByContent);
router.put('/:id', authenticate, ctrl.update);
router.delete('/:id', authenticate, ctrl.remove);
router.post('/:id/helpful', authenticate, ctrl.markHelpful);

module.exports = router;
