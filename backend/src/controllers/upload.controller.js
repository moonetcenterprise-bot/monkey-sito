const AdmZip = require('adm-zip');
const { dbClient } = require('../config/supabaseClient');
const env = require('../config/env');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { processImage } = require('../utils/imageProcessor');

// Ridimensiona/comprime un'immagine con sharp e la carica su Supabase
// Storage nella cartella indicata. Condivisa da tutti gli endpoint di
// upload (singola immagine o immagini estratte da uno ZIP).
async function processAndUpload(buffer, mimetype, folder) {
  const processed = await processImage(buffer, mimetype);
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${processed.ext}`;

  const { error: uploadError } = await dbClient.storage
    .from(env.SUPABASE_STORAGE_BUCKET)
    .upload(path, processed.buffer, { contentType: processed.contentType, upsert: false });

  if (uploadError) throw new ApiError(500, `Upload fallito: ${uploadError.message}`);

  const { data } = dbClient.storage.from(env.SUPABASE_STORAGE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// Fabbrica di handler upload: tutte le immagini (prodotti, editor visivo,
// copertine blog) seguono lo stesso percorso — ridimensiona/comprimi con
// sharp, poi carica su Supabase Storage nella cartella indicata.
function makeUploadHandler(folder) {
  return asyncHandler(async (req, res) => {
    if (!req.file) throw new ApiError(400, 'Nessun file ricevuto (campo atteso: "image")');

    let imageUrl;
    try {
      imageUrl = await processAndUpload(req.file.buffer, req.file.mimetype, folder);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(400, `Immagine non valida: ${err.message}`);
    }

    res.status(201).json({ imageUrl });
  });
}

// POST /api/upload/product-image — solo admin
const uploadProductImage = makeUploadHandler('products');

// POST /api/upload/layout-image — solo admin (Editor visivo, es. sezione "Chi siamo")
const uploadLayoutImage = makeUploadHandler('layout');

// POST /api/upload/post-image — solo admin (copertine articoli del blog)
const uploadPostImage = makeUploadHandler('posts');

const EXT_TO_MIME = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp'
};

// POST /api/upload/product-preview-zip — solo admin
// Accetta un unico file .zip contenente fino a 4 immagini (PNG/JPG/WebP) e le
// carica tutte in un colpo solo, così l'admin non deve ripetere l'upload 4
// volte per le immagini di anteprima di un libro. Le immagini vengono
// ordinate per nome file dentro lo ZIP, così l'ordine è prevedibile (es.
// "1.png", "2.png", "3.png", "4.png").
const uploadProductPreviewZip = asyncHandler(async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Nessun file ricevuto (campo atteso: "zip")');

  let zip;
  try {
    zip = new AdmZip(req.file.buffer);
  } catch (err) {
    throw new ApiError(400, `File ZIP non valido: ${err.message}`);
  }

  const imageEntries = zip.getEntries()
    .filter((entry) => !entry.isDirectory)
    // Ignora file di sistema tipici degli archivi creati su macOS/Windows.
    .filter((entry) => !entry.entryName.startsWith('__MACOSX/') && !entry.entryName.split('/').pop().startsWith('.'))
    .filter((entry) => {
      const ext = entry.entryName.split('.').pop().toLowerCase();
      return Object.prototype.hasOwnProperty.call(EXT_TO_MIME, ext);
    })
    .sort((a, b) => a.entryName.localeCompare(b.entryName, undefined, { numeric: true }))
    .slice(0, 4);

  if (imageEntries.length === 0) {
    throw new ApiError(400, 'Lo ZIP non contiene immagini valide (PNG, JPG o WebP)');
  }

  const imageUrls = [];
  for (const entry of imageEntries) {
    const ext = entry.entryName.split('.').pop().toLowerCase();
    const mimetype = EXT_TO_MIME[ext];
    const buffer = entry.getData();
    try {
      const imageUrl = await processAndUpload(buffer, mimetype, 'products');
      imageUrls.push(imageUrl);
    } catch (err) {
      if (err instanceof ApiError) throw err;
      throw new ApiError(400, `Immagine "${entry.entryName}" non valida: ${err.message}`);
    }
  }

  res.status(201).json({ imageUrls });
});

module.exports = { uploadProductImage, uploadLayoutImage, uploadPostImage, uploadProductPreviewZip };
