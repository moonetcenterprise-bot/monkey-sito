const express = require('express');
const cors = require('cors');
const env = require('./config/env');
const apiRoutes = require('./routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler.middleware');

function createApp() {
  const app = express();

  app.use(
    cors({
      origin(origin, callback) {
        // Richieste senza header Origin (es. curl, health check) sono ammesse.
        if (!origin) return callback(null, true);
        // Se CORS_ORIGINS non è configurata, il comportamento dipende dall'ambiente:
        // in sviluppo si accetta tutto per comodità, in produzione si nega di
        // default (fail-safe) per evitare che una variabile d'ambiente dimenticata
        // apra il backend a qualsiasi sito.
        if (env.CORS_ORIGINS.length === 0) {
          if (env.NODE_ENV !== 'production') return callback(null, true);
          return callback(new Error('CORS_ORIGINS non configurata: nessuna origine autorizzata in produzione.'));
        }
        if (env.CORS_ORIGINS.includes(origin)) {
          return callback(null, true);
        }
        callback(new Error(`Origine non autorizzata da CORS: ${origin}`));
      },
      credentials: true
    })
  );

  // Header di sicurezza minimi (senza dipendere da helmet): riducono il rischio
  // di clickjacking, MIME-sniffing e leak del referrer verso siti terzi.
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  app.use(express.json({ limit: '1mb' }));

  app.use('/api', apiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
