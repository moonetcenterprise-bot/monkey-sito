const { dbClient } = require('../config/supabaseClient');
const env = require('../config/env');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { processImage } = require('../utils/imageProcessor');

// Fabbrica di handler upload: tutte le immagini (prodotti, editor visivo,
// copertine blog) seguono lo stesso percorso — ridimensiona/comprimi con
// sharp, poi carica su Supabase Storage nella cartella indicata.
function makeUploadHandler(folder) {
  return asyncHandler(async (req, res) => {
    if (!req.file) throw new ApiError(400, 'Nessun file ricevuto (campo atteso: "image")');

    let processed;
    try {
      processed = await processImage(req.file.buffer, req.file.mimetype);
    } catch (err) {
      throw new ApiError(400, `Immagine non valida: ${err.message}`);
    }

    const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${processed.ext}`;

    const { error: uploadError } = await dbClient.storage
      .from(env.SUPABASE_STORAGE_BUCKET)
      .upload(path, processed.buffer, { contentType: processed.contentType, upsert: false });

    if (uploadError) throw new ApiError(500, `Upload fallito: ${uploadError.message}`);

    const { data } = dbClient.storage.from(env.SUPABASE_STORAGE_BUCKET).getPublicUrl(path);
    res.status(201).json({ imageUrl: data.publicUrl });
  });
}

// POST /api/upload/product-image — solo admin
const uploadProductImage = makeUploadHandler('products');

// POST /api/upload/layout-image — solo admin (Editor visivo, es. sezione "Chi siamo")
const uploadLayoutImage = makeUploadHandler('layout');

// POST /api/upload/post-image — solo admin (copertine articoli del blog)
const uploadPostImage = makeUploadHandler('posts');

module.exports = { uploadProductImage, uploadLayoutImage, uploadPostImage };
