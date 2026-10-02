const router = require('express').Router();
const ctrl = require('../controllers/coupon.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { isAdmin } = require('../middleware/admin.middleware');

// POST /validate
// GET /admin/all
// POST /admin/create
// PUT /admin/:id
// DELETE /admin/:id
router.use(authenticate);
router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getOne);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
