const { createClient } = require('@supabase/supabase-js');
const env = require('./env');

// Client "pubblico" (anon key): usato solo per le operazioni di Auth che
// riguardano direttamente l'utente (signUp, signInWithPassword, getUser(token)).
const authClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// Client "admin" (service role key): bypassa la Row Level Security.
// Usato per TUTTE le query su tabelle/storage dal backend, che è l'unico
// soggetto fidato — la chiave non viene mai esposta al front end.
const dbClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

module.exports = { authClient, dbClient };
