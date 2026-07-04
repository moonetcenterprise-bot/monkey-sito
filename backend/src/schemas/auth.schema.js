const { z } = require('zod');

const registerSchema = z.object({
  name: z.string().min(1, 'Nome obbligatorio'),
  email: z.string().email('Email non valida'),
  password: z.string().min(6, 'La password deve avere almeno 6 caratteri')
});

const loginSchema = z.object({
  email: z.string().email('Email non valida'),
  password: z.string().min(1, 'Password obbligatoria')
});

const forgotPasswordSchema = z.object({
  email: z.string().email('Email non valida')
});

const resetPasswordSchema = z.object({
  password: z.string().min(6, 'La password deve avere almeno 6 caratteri')
});

module.exports = { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema };
