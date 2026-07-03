// Errore applicativo con status HTTP associato, per distinguere
// "errore atteso" (400/401/403/404) da errori inattesi (500) nell'error handler.
class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

module.exports = ApiError;
