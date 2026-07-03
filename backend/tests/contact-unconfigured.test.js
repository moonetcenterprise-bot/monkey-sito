// Verifica il comportamento "onesto" di sendContactEmail quando l'admin non
// ha ancora configurato l'invio email in .env (SMTP_HOST/USER/PASS assenti).
//
// Testiamo direttamente src/utils/mailer.js invece di passare per l'intera
// app Express: src/config/env.js è un singleton che legge process.env una
// sola volta al primo require e resta in cache per l'intero processo Jest
// (eseguito con --runInBand, quindi un solo processo Node per tutti i file
// di test). Su questa macchina SMTP è configurato correttamente (Gmail) e
// l'invio reale riesce sempre, quindi non è possibile né corretto simulare
// "SMTP assente" manipolando process.env: mockiamo invece il modulo env
// direttamente, così il test è isolato e deterministico indipendentemente
// dal contenuto del .env locale.
jest.mock('../src/config/env', () => ({
  SMTP_HOST: '',
  SMTP_PORT: 465,
  SMTP_SECURE: true,
  SMTP_USER: '',
  SMTP_PASS: '',
  CONTACT_FROM_EMAIL: '',
  CONTACT_TO_EMAIL: ''
}));

const { sendContactEmail } = require('../src/utils/mailer');

describe('sendContactEmail senza SMTP configurato', () => {
  it('lancia un errore esplicativo che menziona SMTP', async () => {
    await expect(
      sendContactEmail({ name: 'Mario', email: 'mario@example.com', message: 'Ciao, un messaggio di prova.' })
    ).rejects.toThrow(/SMTP/i);
  });
});
