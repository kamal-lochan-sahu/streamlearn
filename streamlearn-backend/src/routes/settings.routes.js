const router = require('express').Router();
const ctrl   = require('../controllers/settings.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { isAdmin } = require('../middleware/admin.middleware');

router.get('/', authenticate, ctrl.get);
router.put('/', authenticate, isAdmin, ctrl.update);
router.put('/branding', authenticate, isAdmin, ctrl.updateBranding);
router.put('/features', authenticate, isAdmin, ctrl.updateFeatures);
router.put('/payment', authenticate, isAdmin, ctrl.updatePayment);
router.put('/streaming', authenticate, isAdmin, ctrl.updateStreaming);

module.exports = router;
