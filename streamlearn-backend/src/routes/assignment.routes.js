const router = require('express').Router();
const ctrl   = require('../controllers/assignment.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { isAdmin } = require('../middleware/admin.middleware');

router.use(authenticate);
router.get('/lecture/:lectureId', ctrl.getByLecture);
router.post('/:id/submit',        ctrl.submit);
router.get('/:id/submissions',    isAdmin, ctrl.getSubmissions);
router.post('/',                  isAdmin, ctrl.create);
router.put('/:id',                isAdmin, ctrl.update);
router.delete('/:id',             isAdmin, ctrl.remove);

module.exports = router;
