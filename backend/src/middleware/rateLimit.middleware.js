const rateLimit = require('express-rate-limit');

// Limite stretto per le rotte di autenticazione (login, registrazione, admin-login,
// reset password): mitiga tentativi di brute-force sulle password.
// 15 minuti di finestra, 20 richieste per IP: sufficiente per un utente reale che
// sbaglia password qualche volta, troppo poco per un attacco automatizzato.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Troppi tentativi. Riprova tra qualche minuto.' }
});

// Limite più permissivo per form pubblici (contatti, newsletter): protegge da
// spam/flood senza penalizzare un uso normale.
const publicFormLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Hai inviato troppe richieste. Riprova più tardi.' }
});

module.exports = { authLimiter, publicFormLimiter };
