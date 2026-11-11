const router = require('express').Router();
const ctrl = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { isAdmin, isOwner } = require('../middleware/admin.middleware');

router.use(authenticate);
router.get('/profile', ctrl.getProfile);
router.put('/profile', ctrl.updateProfile);
router.put('/avatar', ctrl.avatarUploadMiddleware, ctrl.updateAvatar);
router.get('/profiles', ctrl.getProfiles);
router.post('/profiles', ctrl.addProfile);
router.put('/profiles/:index/switch', ctrl.switchProfile);
router.put('/profiles/:index', ctrl.updateProfileByIndex);
router.delete('/profiles/:index', ctrl.deleteProfile);
router.get('/watch-history', ctrl.getWatchHistory);
router.put('/continue-watching', ctrl.saveContinueWatching);
router.delete('/continue-watching/:contentId', ctrl.removeContinueWatching);
router.get('/admin/all', isAdmin, ctrl.getAllUsers);
router.put('/admin/:id/status', isAdmin, ctrl.setUserStatus);
router.put('/admin/:id/role', isOwner, ctrl.setUserRole);

module.exports = router;
