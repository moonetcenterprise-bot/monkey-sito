const express = require('express');

const router = express.Router();

router.get('/health', (req, res) => res.json({ ok: true }));

router.use('/products', require('./products.routes'));
router.use('/site-texts', require('./siteTexts.routes'));
router.use('/page-layout', require('./pageLayout.routes'));
router.use('/auth', require('./auth.routes'));
router.use('/favorites', require('./favorites.routes'));
router.use('/upload', require('./upload.routes'));
router.use('/contact', require('./contact.routes'));
router.use('/bundles', require('./bundles.routes'));
router.use('/newsletter', require('./newsletter.routes'));
router.use('/posts', require('./posts.routes'));
router.use('/admin', require('./admin.routes'));

module.exports = router;
