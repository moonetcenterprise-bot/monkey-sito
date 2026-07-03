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
        if (env.CORS_ORIGINS.length === 0 || env.CORS_ORIGINS.includes(origin)) {
          return callback(null, true);
        }
        callback(new Error(`Origine non autorizzata da CORS: ${origin}`));
      },
      credentials: true
    })
  );

  app.use(express.json({ limit: '1mb' }));

  app.use('/api', apiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
