const express = require('express');
const controller = require('../controllers/admin.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const requireAdmin = require('../middleware/requireAdmin.middleware');
const { validateBody } = require('../middleware/validate.middleware');
const { moderateReviewSchema } = require('../schemas/reviews.schema');
const { createBundleSchema, updateBundleSchema } = require('../schemas/bundles.schema');
const { createPostSchema, updatePostSchema } = require('../schemas/posts.schema');

const router = express.Router();

// Tutte le rotte di questo router richiedono un admin autenticato.
router.use(requireAuth, requireAdmin);

router.get('/users', controller.listUsers);
router.put('/users/:id', controller.updateUserAdmin);
router.get('/stats', controller.getStats);

router.get('/reviews', controller.listReviews);
router.put('/reviews/:id', validateBody(moderateReviewSchema), controller.moderateReview);
router.delete('/reviews/:id', controller.deleteReview);

router.get('/bundles', controller.listBundlesAdmin);
router.post('/bundles', validateBody(createBundleSchema), controller.createBundle);
router.put('/bundles/:id', validateBody(updateBundleSchema), controller.updateBundle);
router.delete('/bundles/:id', controller.deleteBundle);

router.get('/newsletter', controller.listNewsletter);

router.get('/posts', controller.listPostsAdmin);
router.post('/posts', validateBody(createPostSchema), controller.createPost);
router.put('/posts/:id', validateBody(updatePostSchema), controller.updatePost);
router.delete('/posts/:id', controller.deletePost);

module.exports = router;
