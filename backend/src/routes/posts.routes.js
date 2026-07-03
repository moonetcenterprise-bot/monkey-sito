const express = require('express');
const controller = require('../controllers/posts.controller');

const router = express.Router();

router.get('/', controller.listPublished);
router.get('/:slug', controller.getPublished);

module.exports = router;
