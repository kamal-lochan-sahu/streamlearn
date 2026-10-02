const router = require('express').Router();
const ctrl = require('../controllers/search.controller');
const { optionalAuth } = require('../middleware/auth.middleware');

router.get('/', optionalAuth, ctrl.search);
router.get('/suggestions', ctrl.suggestions);

module.exports = router;
