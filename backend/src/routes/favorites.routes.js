const express = require('express');
const controller = require('../controllers/favorites.controller');
const { requireAuth } = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/', requireAuth, controller.listFavorites);
router.post('/toggle', requireAuth, controller.toggleFavorite);

module.exports = router;
