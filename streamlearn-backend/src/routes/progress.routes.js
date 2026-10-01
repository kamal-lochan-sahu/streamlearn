const router = require('express').Router();
const ctrl   = require('../controllers/progress.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);
router.get('/content/:contentId', ctrl.getProgress);
router.put('/lecture/:lectureId', ctrl.markLectureComplete);
router.put('/timestamp', ctrl.saveTimestamp);
router.get('/certificate/:contentId', ctrl.getCertificate);
router.post('/certificate/generate', ctrl.generateCertificate);

module.exports = router;
