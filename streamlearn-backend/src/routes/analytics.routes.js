const router = require('express').Router();
const ctrl   = require('../controllers/analytics.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { isAdmin } = require('../middleware/admin.middleware');

router.use(authenticate, isAdmin);
router.get('/dashboard', ctrl.getDashboard);
router.get('/content', ctrl.getContent);
router.get('/subscribers', ctrl.getSubscribers);
router.get('/revenue', ctrl.getRevenue);
router.get('/live', ctrl.getLive);
router.get('/export', ctrl.exportData);

module.exports = router;
