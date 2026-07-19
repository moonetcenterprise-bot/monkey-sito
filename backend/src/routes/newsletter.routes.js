const express = require('express');
const controller = require('../controllers/newsletter.controller');
const { validateBody } = require('../middleware/validate.middleware');
const { publicFormLimiter } = require('../middleware/rateLimit.middleware');
const { subscribeSchema } = require('../schemas/newsletter.schema');

const router = express.Router();

router.post('/subscribe', publicFormLimiter, validateBody(subscribeSchema), controller.subscribe);

module.exports = router;
