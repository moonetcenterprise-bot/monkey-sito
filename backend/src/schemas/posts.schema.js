const { z } = require('zod');

const bilingual = z.object({ it: z.string().min(1), en: z.string().min(1) });
const bilingualOptional = z.object({ it: z.string().optional(), en: z.string().optional() }).optional();

const postBase = {
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'slug: solo minuscole, numeri e trattini'),
  title: bilingual,
  excerpt: bilingualOptional,
  body: bilingual,
  coverImage: z.string().nullable().optional(),
  published: z.boolean().optional()
};

const createPostSchema = z.object(postBase);
const updatePostSchema = z.object(postBase).partial();

module.exports = { createPostSchema, updatePostSchema };
