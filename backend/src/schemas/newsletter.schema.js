const { z } = require('zod');

const subscribeSchema = z.object({
  email: z.string().email('Email non valida'),
  locale: z.enum(['it', 'en']).optional()
});

module.exports = { subscribeSchema };
