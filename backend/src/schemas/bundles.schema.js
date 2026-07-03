const { z } = require('zod');

const bilingual = z.object({ it: z.string().min(1), en: z.string().min(1) });

const bundleBase = {
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'slug: solo minuscole, numeri e trattini'),
  title: bilingual,
  productIds: z.array(z.number().int()).min(1, 'Seleziona almeno un prodotto'),
  discountPct: z.number().min(0).max(100).optional(),
  imageUrl: z.string().nullable().optional(),
  active: z.boolean().optional(),
  order: z.number().int().nonnegative().optional()
};

const createBundleSchema = z.object(bundleBase);
const updateBundleSchema = z.object(bundleBase).partial();

module.exports = { createBundleSchema, updateBundleSchema };
