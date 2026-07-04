const { authClient, dbClient } = require('../config/supabaseClient');
const profilesModel = require('../models/profiles.model');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const env = require('../config/env');

function toClientUser(user, profile) {
  return {
    name: (profile && profile.name) || (user.user_metadata && user.user_metadata.name) || '',
    email: user.email,
    isAdmin: Boolean(profile && profile.is_admin)
  };
}

// POST /api/auth/register
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const { data: signUpData, error: signUpError } = await authClient.auth.signUp({
    email,
    password,
    options: { data: { name } }
  });

  if (signUpError) {
    if (/registered/i.test(signUpError.message)) {
      throw new ApiError(409, 'EMAIL_EXISTS');
    }
    throw new ApiError(400, signUpError.message);
  }

  const user = signUpData.user;
  await profilesModel.create({ id: user.id, name, email });

  let session = signUpData.session;
  if (!session) {
    // Se nel progetto Supabase è attiva la conferma email, non arriva una
    // sessione immediata: proviamo comunque il login (funziona se la
    // conferma è disattivata) altrimenti chiediamo di controllare la casella.
    const { data: signInData } = await authClient.auth.signInWithPassword({ email, password });
    session = signInData && signInData.session;
  }

  if (!session) {
    return res.status(201).json({
      name,
      email,
      requiresEmailConfirmation: true
    });
  }

  res.status(201).json({
    name,
    email,
    isAdmin: false,
    token: session.access_token
  });
});

// POST /api/auth/login
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { data, error } = await authClient.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw new ApiError(401, 'INVALID_CREDENTIALS');
  }
  const profile = await profilesModel.findById(data.user.id);
  res.json({ ...toClientUser(data.user, profile), token: data.session.access_token });
});

// POST /api/auth/admin-login — stesso account utente, ma richiede is_admin=true
const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const { data, error } = await authClient.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    throw new ApiError(401, 'INVALID_CREDENTIALS');
  }
  const profile = await profilesModel.findById(data.user.id);
  if (!profile || !profile.is_admin) {
    throw new ApiError(403, 'NOT_ADMIN');
  }
  res.json({ ...toClientUser(data.user, profile), token: data.session.access_token });
});

// POST /api/auth/logout
const logout = asyncHandler(async (req, res) => {
  if (req.token) {
    await authClient.auth.admin.signOut(req.token).catch(() => {});
  }
  res.status(204).send();
});

// GET /api/auth/me — richiede requireAuth
const me = asyncHandler(async (req, res) => {
  const profile = await profilesModel.findById(req.user.id);
  res.json({
    name: (profile && profile.name) || '',
    email: req.user.email,
    isAdmin: Boolean(profile && profile.is_admin)
  });
});

// POST /api/auth/forgot-password — pubblico
// Chiede a Supabase Auth di inviare l'email con il link di recupero. Risponde
// sempre con successo (anche se l'email non esiste) per non rivelare a chi
// prova a indovinare se un indirizzo è registrato o no sul sito.
const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const redirectTo = `${env.SITE_URL}/ResetPassword.dc.html`;
  await authClient.auth.resetPasswordForEmail(email, { redirectTo }).catch((e) => {
    console.error('[auth] resetPasswordForEmail', e);
  });
  res.status(204).send();
});

// POST /api/auth/reset-password — richiede requireAuth con il token di
// recupero che Supabase mette nel link dell'email (non una password, un JWT):
// requireAuth verifica quel token e popola req.user con l'id dell'utente.
// Usiamo dbClient (service role, Admin API) invece del client anon condiviso:
// authClient non mantiene sessioni per richiesta (persistSession: false ed è
// condiviso tra tutte le richieste concorrenti), quindi "updateUser" su di
// esso non avrebbe un contesto utente affidabile. updateUserById è invece
// mirato esplicitamente all'id verificato da requireAuth.
const resetPassword = asyncHandler(async (req, res) => {
  const { password } = req.body;
  const { error } = await dbClient.auth.admin.updateUserById(req.user.id, { password });
  if (error) throw new ApiError(400, error.message);
  res.status(204).send();
});

module.exports = { register, login, adminLogin, logout, me, forgotPassword, resetPassword };
