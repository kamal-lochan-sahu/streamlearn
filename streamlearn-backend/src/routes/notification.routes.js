const router = require('express').Router();
const ctrl   = require('../controllers/notification.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { isAdmin } = require('../middleware/admin.middleware');

router.use(authenticate);
router.get('/',            ctrl.getAll);
router.get('/unread-count',ctrl.getUnreadCount);
router.put('/read-all',    ctrl.markAllRead);
router.put('/:id/read',    ctrl.markRead);
router.post('/admin/send', isAdmin, ctrl.sendAdmin);

module.exports = router;
