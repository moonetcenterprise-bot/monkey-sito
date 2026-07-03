const { authClient } = require('../config/supabaseClient');
const profilesModel = require('../models/profiles.model');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

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

module.exports = { register, login, adminLogin, logout, me };
