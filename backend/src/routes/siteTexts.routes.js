const express = require('express');
const controller = require('../controllers/siteTexts.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const requireAdmin = require('../middleware/requireAdmin.middleware');
const { validateBody } = require('../middleware/validate.middleware');
const { siteTextsSchema } = require('../schemas/siteTexts.schema');

const router = express.Router();

router.get('/', controller.getSiteTexts);
router.put('/', requireAuth, requireAdmin, validateBody(siteTextsSchema), controller.saveSiteTexts);

module.exports = router;
