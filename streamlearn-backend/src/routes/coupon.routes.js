const router = require('express').Router();
const ctrl = require('../controllers/coupon.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { isAdmin } = require('../middleware/admin.middleware');

router.use(authenticate);

// Any logged-in user
router.post('/validate', ctrl.validate);

// Admin only
router.get('/admin/all', isAdmin, ctrl.getAll);
router.get('/admin/:id', isAdmin, ctrl.getOne);
router.post('/admin/create', isAdmin, ctrl.create);
router.put('/admin/:id', isAdmin, ctrl.update);
router.delete('/admin/:id', isAdmin, ctrl.remove);

module.exports = router;
