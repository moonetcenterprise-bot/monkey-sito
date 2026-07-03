// Le variabili SMTP vengono impostate PRIMA di qualunque require: config/env.js
// legge process.env una sola volta al primo require e lo mette in cache, quindi
// vanno fissate qui in cima al file (ogni file di test gira in un registro dei
// moduli Jest isolato, quindi questo non influenza gli altri file di test).
process.env.SMTP_HOST = 'smtp.resend.com';
process.env.SMTP_PORT = '465';
process.env.SMTP_SECURE = 'true';
process.env.SMTP_USER = 'resend';
process.env.SMTP_PASS = 'fake-api-key';
process.env.CONTACT_FROM_EMAIL = 'onboarding@resend.dev';
process.env.CONTACT_TO_EMAIL = 'owner@example.com';

jest.mock('../src/config/supabaseClient');
jest.mock('nodemailer');

const nodemailer = require('nodemailer');
const request = require('supertest');
const createApp = require('../src/app');

// mailer.js mette in cache il transporter al primo utilizzo: per questo il
// mock di sendMail va creato una sola volta e riconfigurato per-test con
// mockResolvedValueOnce/mockRejectedValueOnce, invece di sostituire l'intero
// transporter (che dopo la prima chiamata non verrebbe più ricreato).
const sendMail = jest.fn();
nodemailer.createTransport.mockReturnValue({ sendMail });

describe('POST /api/contact', () => {
  it('400 se il body non è valido', async () => {
    const app = createApp();
    const res = await request(app).post('/api/contact').send({ name: '', email: 'x', message: '' });
    expect(res.status).toBe(400);
  });

  it('202 se l\'invio va a buon fine', async () => {
    sendMail.mockResolvedValueOnce({ messageId: '1' });

    const app = createApp();
    const res = await request(app)
      .post('/api/contact')
      .send({ name: 'Mario', email: 'mario@example.com', message: 'Ciao, un messaggio di prova.' });

    expect(res.status).toBe(202);
    expect(sendMail).toHaveBeenCalledTimes(1);
    expect(sendMail.mock.calls[0][0]).toMatchObject({
      to: 'owner@example.com',
      replyTo: 'mario@example.com'
    });
  });

  it('502 se l\'invio SMTP fallisce', async () => {
    sendMail.mockRejectedValueOnce(new Error('SMTP down'));

    const app = createApp();
    const res = await request(app)
      .post('/api/contact')
      .send({ name: 'Mario', email: 'mario@example.com', message: 'Ciao, un messaggio di prova.' });

    expect(res.status).toBe(502);
  });
});
