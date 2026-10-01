const router = require('express').Router();
const ctrl   = require('../controllers/upload.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { isCreator } = require('../middleware/admin.middleware');

router.post('/video', authenticate, isCreator, ctrl.videoUploadMiddleware, ctrl.uploadVideo);
router.post('/image', authenticate, ctrl.imageUploadMiddleware, ctrl.uploadImage);
router.post('/pdf',   authenticate, ctrl.pdfUploadMiddleware, ctrl.uploadPDF);
router.get('/status/:jobId', authenticate, ctrl.getTranscodeStatus);

module.exports = router;
