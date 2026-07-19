const express = require('express');
const controller = require('../controllers/contact.controller');
const { validateBody } = require('../middleware/validate.middleware');
const { publicFormLimiter } = require('../middleware/rateLimit.middleware');
const { contactSchema } = require('../schemas/contact.schema');

const router = express.Router();

router.post('/', publicFormLimiter, validateBody(contactSchema), controller.sendContact);

module.exports = router;
