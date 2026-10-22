const router = require('express').Router();
const ctrl = require('../controllers/upload.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { isCreator } = require('../middleware/admin.middleware');

// Uploads cost money (Cloudinary, transcoding), so only creators and staff may use them.
router.use(authenticate, isCreator);
router.post('/video', ctrl.videoUploadMiddleware, ctrl.uploadVideo);
router.post('/image', ctrl.imageUploadMiddleware, ctrl.uploadImage);
router.post('/pdf', ctrl.pdfUploadMiddleware, ctrl.uploadPDF);
router.get('/status/:jobId', ctrl.getTranscodeStatus);

module.exports = router;
