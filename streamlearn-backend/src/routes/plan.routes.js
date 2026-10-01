const router = require('express').Router();
const ctrl   = require('../controllers/plan.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { isAdmin } = require('../middleware/admin.middleware');

router.get('/', ctrl.getAll);
router.get('/admin/all', authenticate, isAdmin, ctrl.getAllAdmin);
router.post('/admin/create', authenticate, isAdmin, ctrl.create);
router.put('/admin/:id', authenticate, isAdmin, ctrl.update);
router.delete('/admin/:id', authenticate, isAdmin, ctrl.remove);
router.get('/:id', ctrl.getOne);

module.exports = router;
