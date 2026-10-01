const router = require('express').Router();
const ctrl   = require('../controllers/watchparty.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);
router.post('/create',      ctrl.create);
router.post('/join/:code',  ctrl.join);
router.get('/:id',          ctrl.getOne);
router.put('/:id/sync',     ctrl.sync);
router.post('/:id/chat',    ctrl.chat);
router.delete('/:id/leave', ctrl.leave);

module.exports = router;
