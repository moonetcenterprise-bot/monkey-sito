const ApiError = require('../utils/ApiError');

// Valida req.body con uno schema Zod. In caso di errore risponde 400
// con il dettaglio dei campi non validi, senza mai far arrivare dati
// sporchi ai controller/modelli.
function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(new ApiError(400, 'Dati non validi', result.error.flatten()));
    }
    req.body = result.data;
    next();
  };
}

module.exports = { validateBody };
