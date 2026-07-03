const ApiError = require('../utils/ApiError');

function notFoundHandler(req, res) {
  res.status(404).json({ error: 'Rotta non trovata', path: req.originalUrl });
}

// Error handler centralizzato: unico posto che decide status code e forma
// della risposta di errore per tutta l'API.
function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ error: err.message, details: err.details });
  }
  console.error('[unhandled error]', err);
  const status = err.statusCode || 500;
  res.status(status).json({ error: 'Errore interno del server' });
}

module.exports = { notFoundHandler, errorHandler };
