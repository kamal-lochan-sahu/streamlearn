const router = require('express').Router();
const ctrl   = require('../controllers/watchlist.controller');
const { authenticate } = require('../middleware/auth.middleware');

router.use(authenticate);
router.get('/', ctrl.get);
router.post('/add/:contentId', ctrl.add);
router.delete('/remove/:contentId', ctrl.remove);
router.get('/check/:contentId', ctrl.check);

module.exports = router;
