const router = require('express').Router();
const ctrl = require('../controllers/assignment.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { isCreator } = require('../middleware/admin.middleware');

router.use(authenticate);
router.get('/lecture/:lectureId', ctrl.getByLecture);
router.post('/:id/submit', ctrl.submit);
router.get('/:id/submissions', isCreator, ctrl.getSubmissions);
router.post('/', isCreator, ctrl.create);
router.put('/:id', isCreator, ctrl.update);
router.delete('/:id', isCreator, ctrl.remove);

module.exports = router;
