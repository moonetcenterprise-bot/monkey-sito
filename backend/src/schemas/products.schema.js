const { z } = require('zod');

const bilingual = z.object({ it: z.string().min(1), en: z.string().min(1) });

const productBase = {
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'slug: solo minuscole, numeri e trattini'),
  category: z.enum(['kids', 'teens', 'adults', 'seasonal']),
  price: z.number().nonnegative(),
  oldPrice: z.number().nonnegative().nullable().optional(),
  pages: z.number().int().positive().optional(),
  age: z.string().optional(),
  rating: z.number().min(0).max(5).optional(),
  reviewsCount: z.number().int().nonnegative().optional(),
  badge: z.string().nullable().optional(),
  order: z.number().int().nonnegative().optional(),
  imageDataUrl: z.string().nullable().optional(),
  // Fino a 4 immagini di anteprima (disegni interni), scelte dall'admin.
  // Array vuoto/assente = nessuna sezione anteprima mostrata sul sito.
  previewImages: z.array(z.string().nullable()).max(4).optional(),
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
