// Carica e valida le variabili d'ambiente una sola volta, all'avvio del processo.
require('dotenv').config();

function required(name, { allowEmptyInTest = false } = {}) {
  const value = process.env[name];
  if (!value) {
    if (process.env.NODE_ENV === 'test' && allowEmptyInTest) return '';
    throw new Error(
      `Variabile d'ambiente mancante: ${name}. Copia .env.example in .env e compilala.`
    );
  }
  return value;
}

const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '4000', 10),
  CORS_ORIGINS: (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  SUPABASE_URL: required('SUPABASE_URL', { allowEmptyInTest: true }),
  SUPABASE_ANON_KEY: required('SUPABASE_ANON_KEY', { allowEmptyInTest: true }),
  SUPABASE_SERVICE_ROLE_KEY: required('SUPABASE_SERVICE_ROLE_KEY', { allowEmptyInTest: true }),
  SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET || 'product-images',

  // URL pubblico del sito (front end), usato per costruire il link dentro
  // l'email di reset password che Supabase invia al cliente: deve puntare
  // alla pagina ResetPassword.dc.html del sito pubblicato, non al backend.
  SITE_URL: process.env.SITE_URL || 'http://localhost:3000',

  SMTP_HOST: process.env.SMTP_HOST || '',
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '465', 10),
  SMTP_SECURE: (process.env.SMTP_SECURE || 'true') === 'true',
  SMTP_USER: process.env.SMTP_USER || '',
  SMTP_PASS: process.env.SMTP_PASS || '',
  CONTACT_FROM_EMAIL: process.env.CONTACT_FROM_EMAIL || '',
  CONTACT_TO_EMAIL: process.env.CONTACT_TO_EMAIL || '',

  // Invio email via API HTTP di Resend (https://resend.com/docs/api-reference/emails/send-email),
  // usata al posto del relay SMTP: alcuni hosting cloud gratuiti (es. Render free
  // tier) bloccano le connessioni SMTP in uscita, causando "Connection timeout"
  // indipendentemente dal provider SMTP configurato. L'API HTTP passa per HTTPS
  // (porta 443), che resta sempre raggiungibile. Se RESEND_API_KEY non è
  // impostata, mailer.js ripiega sul vecchio invio via Nodemailer/SMTP.
  RESEND_API_KEY: process.env.RESEND_API_KEY || ''
};

module.exports = env;
