const nodemailer = require('nodemailer');
const env = require('../config/env');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS) {
    return null; // non configurato: il chiamante gestisce il caso
  }
  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS }
  });
  return transporter;
}

async function sendContactEmail({ name, email, message }) {
  const t = getTransporter();
  if (!t) {
    throw new Error(
      'SMTP non configurato: compila SMTP_HOST/SMTP_USER/SMTP_PASS/CONTACT_TO_EMAIL nel file .env'
    );
  }
  return t.sendMail({
    from: env.CONTACT_FROM_EMAIL || env.SMTP_USER,
    to: env.CONTACT_TO_EMAIL,
    replyTo: email,
    subject: `[Monkey — Contatto] Messaggio da ${name}`,
    text: `Nome: ${name}\nEmail: ${email}\n\nMessaggio:\n${message}`
  });
}

module.exports = { sendContactEmail, getTransporter };
