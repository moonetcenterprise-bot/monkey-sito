const { z } = require('zod');

const bilingual = z.object({ it: z.string().min(1), en: z.string().min(1) });
// Formato libero, a differenza di "bilingual": può restare vuoto in entrambe
// le lingue finché l'admin non lo compila, senza bloccare il salvataggio.
const bilingualOptionalText = z.object({ it: z.string().optional(), en: z.string().optional() }).optional();

const productBase = {
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'slug: solo minuscole, numeri e trattini'),
  category: z.enum(['kids', 'teens', 'adults', 'seasonal']),
  price: z.number().nonnegative(),
  oldPrice: z.number().nonnegative().nullable().optional(),
  pages: z.number().int().positive().optional(),
  age: z.string().optional(),
  // rating/reviewsCount sono calcolati automaticamente dalle recensioni
  // approvate (vedi products.model.js -> applyReviewStats) e valgono null
  // quando il prodotto non ha ancora recensioni. L'admin li rimanda indietro
  // invariati insieme al resto del prodotto ad ogni salvataggio (es. dopo
  // aver caricato un'immagine): lo schema deve quindi accettare null e non
  // solo "assente", altrimenti il salvataggio fallisce con "Dati non validi"
  // per qualunque prodotto privo di recensioni.
  rating: z.number().min(0).max(5).nullable().optional(),
  reviewsCount: z.number().int().nonnegative().nullable().optional(),
  badge: z.string().nullable().optional(),
  order: z.number().int().nonnegative().optional(),
  imageDataUrl: z.string().nullable().optional(),
  // Fino a 4 immagini di anteprima (disegni interni), scelte dall'admin.
  // Array vuoto/assente = nessuna sezione anteprima mostrata sul sito.
  previewImages: z.array(z.string().nullable()).max(4).optional(),
  // Formato del libro (dimensioni in pollici + tipo di copertina), testo
  // libero inserito dall'admin, es. "5.5 x 5.5 in, softcover".
  format: bilingualOptionalText,
  // Nessun .url() rigido: si accettano link Amazon con parametri/affiliazione
  // di qualunque dominio regionale (amazon.it, amazon.com, ...) o stringa vuota.
  amazonUrl: z.string().nullable().optional(),
  title: bilingual,
  tagline: bilingual,
  description: bilingual
};

const createProductSchema = z.object(productBase);
const updateProductSchema = z.object(productBase).partial();
const reorderSchema = z.object({ orderedIds: z.array(z.number().int()) });

module.exports = { createProductSchema, updateProductSchema, reorderSchema };
