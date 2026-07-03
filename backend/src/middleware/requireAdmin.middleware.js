const { dbClient } = require('../config/supabaseClient');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// Da usare SEMPRE dopo requireAuth. Controlla il flag is_admin sul profilo
// dell'utente autenticato (tabella profiles), niente più credenziali hardcoded.
const requireAdmin = asyncHandler(async (req, res, next) => {
  if (!req.user) throw new ApiError(401, 'Autenticazione richiesta');

  const { data, error } = await dbClient
    .from('profiles')
    .select('is_admin')
    .eq('id', req.user.id)
    .single();

  if (error || !data || !data.is_admin) {
    throw new ApiError(403, 'Accesso riservato agli amministratori');
  }
  next();
});

module.exports = requireAdmin;
