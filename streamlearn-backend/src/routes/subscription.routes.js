const router = require('express').Router();
const ctrl = require('../controllers/subscription.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { isAdmin } = require('../middleware/admin.middleware');

router.use(authenticate);
router.get('/my', ctrl.getMy);
router.post('/subscribe', ctrl.subscribe);
router.put('/cancel', ctrl.cancel);
router.put('/pause', ctrl.pause);
router.put('/resume', ctrl.resume);
router.get('/admin/all', isAdmin, ctrl.getAll);

module.exports = router;
