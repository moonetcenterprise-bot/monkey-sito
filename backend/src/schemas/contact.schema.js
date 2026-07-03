const { z } = require('zod');

const contactSchema = z.object({
  name: z.string().min(1, 'Nome obbligatorio'),
  email: z.string().email('Email non valida'),
  message: z.string().min(5, 'Messaggio troppo corto')
});

module.exports = { contactSchema };
