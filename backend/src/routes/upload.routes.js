const express = require('express');
const multer = require('multer');
const controller = require('../controllers/upload.controller');
const { requireAuth } = require('../middleware/auth.middleware');
const requireAdmin = require('../middleware/requireAdmin.middleware');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB, coerente col free tier Supabase Storage
  fileFilter: (req, file, cb) => {
    if (!/^image\//.test(file.mimetype)) return cb(new Error('Solo immagini sono ammesse'));
    cb(null, true);
  }
});

const router = express.Router();

router.post('/product-image', requireAuth, requireAdmin, upload.single('image'), controller.uploadProductImage);
router.post('/layout-image', requireAuth, requireAdmin, upload.single('image'), controller.uploadLayoutImage);
router.post('/post-image', requireAuth, requireAdmin, upload.single('image'), controller.uploadPostImage);

module.exports = router;
