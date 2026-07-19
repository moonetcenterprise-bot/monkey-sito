const express = require('express');
const controller = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const { validateBody } = require('../middleware/validate.middleware');
const { authLimiter } = require('../middleware/rateLimit.middleware');
const { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } = require('../schemas/auth.schema');

const router = express.Router();

router.post('/register', authLimiter, validateBody(registerSchema), controller.register);
router.post('/login', authLimiter, validateBody(loginSchema), controller.login);
router.post('/admin-login', authLimiter, validateBody(loginSchema), controller.adminLogin);
router.post('/logout', requireAuth, controller.logout);
router.get('/me', requireAuth, controller.me);
router.post('/forgot-password', authLimiter, validateBody(forgotPasswordSchema), controller.forgotPassword);
router.post('/reset-password', authLimiter, requireAuth, validateBody(resetPasswordSchema), controller.resetPassword);

module.exports = router;
