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

// Invio via API HTTP di Resend (porta 443/HTTPS). Preferita rispetto a SMTP
// perché alcuni hosting cloud gratuiti (es. Render free tier) bloccano le
// connessioni SMTP in uscita, causando "Connection timeout" indipendentemente
// dal provider configurato.
async function sendViaResendApi({ name, email, message }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: env.CONTACT_FROM_EMAIL || 'onboarding@resend.dev',
      to: [env.CONTACT_TO_EMAIL],
      reply_to: email,
      subject: `[Monkey — Contatto] Messaggio da ${name}`,
      text: `Nome: ${name}\nEmail: ${email}\n\nMessaggio:\n${message}`
    })
  });

  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.json();
      detail = body && body.message ? body.message : JSON.stringify(body);
    } catch (e) {
      detail = await res.text().catch(() => '');
    }
    throw new Error(`Resend API ha risposto ${res.status}: ${detail}`);
  }

  return res.json();
}

async function sendContactEmail({ name, email, message }) {
  if (env.RESEND_API_KEY) {
    return sendViaResendApi({ name, email, message });
  }

  const t = getTransporter();
  if (!t) {
    throw new Error(
      'SMTP non configurato: compila RESEND_API_KEY (consigliato) oppure SMTP_HOST/SMTP_USER/SMTP_PASS/CONTACT_TO_EMAIL nel file .env'
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
