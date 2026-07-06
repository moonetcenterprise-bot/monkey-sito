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

// Limite più ampio per lo ZIP delle 4 immagini di anteprima: fino a 4 PNG
// possono superare facilmente i 5 MB della singola immagine.
const ZIP_MIME_TYPES = new Set(['application/zip', 'application/x-zip-compressed', 'application/x-zip', 'application/octet-stream']);
const uploadZip = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (req, file, cb) => {
    const looksLikeZip = ZIP_MIME_TYPES.has(file.mimetype) || /\.zip$/i.test(file.originalname || '');
    if (!looksLikeZip) return cb(new Error('È ammesso solo un file .zip'));
    cb(null, true);
  }
});

const router = express.Router();

router.post('/product-image', requireAuth, requireAdmin, upload.single('image'), controller.uploadProductImage);
router.post('/layout-image', requireAuth, requireAdmin, upload.single('image'), controller.uploadLayoutImage);
router.post('/post-image', requireAuth, requireAdmin, upload.single('image'), controller.uploadPostImage);
router.post('/product-preview-zip', requireAuth, requireAdmin, uploadZip.single('zip'), controller.uploadProductPreviewZip);

module.exports = router;
