const router = require('express').Router();
const ctrl = require('../controllers/doubt.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);
router.get('/lecture/:lectureId', ctrl.getByLecture);
router.post('/', ctrl.create);
router.post('/:id/answer', ctrl.answer);
router.put('/:id/resolve', ctrl.resolve);

module.exports = router;
