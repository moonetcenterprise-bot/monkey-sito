const express = require('express');
const controller = require('../controllers/pageLayout.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const requireAdmin = require('../middleware/requireAdmin.middleware');
const { validateBody } = require('../middleware/validate.middleware');
const { pageLayoutSchema } = require('../schemas/pageLayout.schema');

const router = express.Router();

router.get('/:page', controller.getPageLayout);
router.put('/:page', requireAuth, requireAdmin, validateBody(pageLayoutSchema), controller.savePageLayout);

module.exports = router;
