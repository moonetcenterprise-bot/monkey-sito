const { authClient } = require('../config/supabaseClient');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// Verifica il Bearer token (JWT emesso da Supabase Auth) e popola req.user.
// Da usare su tutte le rotte che richiedono un utente autenticato.
const requireAuth = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) throw new ApiError(401, 'Autenticazione richiesta');

  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data || !data.user) {
    throw new ApiError(401, 'Sessione non valida o scaduta');
  }

  req.user = { id: data.user.id, email: data.user.email };
  req.token = token;
  next();
});

// Come requireAuth, ma non blocca la richiesta se manca il token:
// popola req.user solo se presente e valido (utile per rotte pubbliche
// che vogliono comunque sapere "chi è" l'utente, se loggato).
const attachUserIfPresent = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next();

  const { data } = await authClient.auth.getUser(token);
  if (data && data.user) {
    req.user = { id: data.user.id, email: data.user.email };
    req.token = token;
  }
  next();
});

module.exports = { requireAuth, attachUserIfPresent };
