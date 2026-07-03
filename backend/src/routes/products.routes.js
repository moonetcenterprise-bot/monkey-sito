const express = require('express');
const controller = require('../controllers/products.controller');
const reviewsController = require('../controllers/reviews.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const requireAdmin = require('../middleware/requireAdmin.middleware');
const { validateBody } = require('../middleware/validate.middleware');
const { createProductSchema, updateProductSchema, reorderSchema } = require('../schemas/products.schema');
const { createReviewSchema } = require('../schemas/reviews.schema');

const router = express.Router();

router.get('/', controller.listProducts);
router.get('/:slug', controller.getProduct);
router.get('/:slug/reviews', reviewsController.listForProduct);
router.post('/:slug/reviews', requireAuth, validateBody(createReviewSchema), reviewsController.createForProduct);

router.post('/', requireAuth, requireAdmin, validateBody(createProductSchema), controller.createProduct);
router.post('/reorder', requireAuth, requireAdmin, validateBody(reorderSchema), controller.reorderProducts);
router.put('/:id', requireAuth, requireAdmin, validateBody(updateProductSchema), controller.updateProduct);
router.delete('/:id', requireAuth, requireAdmin, controller.deleteProduct);

module.exports = router;
