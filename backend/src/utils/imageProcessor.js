const sharp = require('sharp');

// Limite ragionevole per immagini di copertina/blog: oltre questa dimensione
// non serve più risoluzione per lo schermo, si guadagna solo peso.
const MAX_DIMENSION = 1600;

// Ridimensiona (solo se più grande, mai ingrandisce) e comprime l'immagine
// prima di salvarla su storage. Mantiene PNG/WebP per non perdere eventuale
// trasparenza; qualunque altro formato viene normalizzato a JPEG compresso.
async function processImage(buffer, mimetype) {
  const pipeline = sharp(buffer).resize({
    width: MAX_DIMENSION,
    height: MAX_DIMENSION,
    fit: 'inside',
    withoutEnlargement: true
  });

  if (mimetype === 'image/png') {
    return { buffer: await pipeline.png({ compressionLevel: 8 }).toBuffer(), ext: 'png', contentType: 'image/png' };
  }
  if (mimetype === 'image/webp') {
    return { buffer: await pipeline.webp({ quality: 82 }).toBuffer(), ext: 'webp', contentType: 'image/webp' };
  }
  return { buffer: await pipeline.jpeg({ quality: 82, mozjpeg: true }).toBuffer(), ext: 'jpg', contentType: 'image/jpeg' };
}

module.exports = { processImage, MAX_DIMENSION };
