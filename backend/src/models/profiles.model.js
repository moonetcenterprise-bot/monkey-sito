const { dbClient } = require('../config/supabaseClient');

const TABLE = 'profiles';

// Rete di sicurezza: il profilo viene normalmente già creato dal trigger DB
// handle_new_user (vedi supabase/schema.sql) subito dopo la signUp. Questo upsert
// non fa nulla se la riga esiste già (ignoreDuplicates), quindi è sicuro
// chiamarlo comunque dal backend senza generare errori di chiave duplicata.
async function create({ id, name, email }) {
  const { error } = await dbClient
    .from(TABLE)
    .upsert({ id, name, email, is_admin: false }, { onConflict: 'id', ignoreDuplicates: true });
  if (error) throw error;
}

async function findById(id) {
  const { data, error } = await dbClient.from(TABLE).select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data;
}

async function isAdmin(id) {
  const profile = await findById(id);
  return Boolean(profile && profile.is_admin);
}

// Elenco di tutti i clienti registrati, per la sezione "Utenti" del pannello admin.
async function listAll() {
  const { data, error } = await dbClient
    .from(TABLE)
    .select('id, name, email, is_admin, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

// Promuove/rimuove i permessi admin di un utente (sostituisce la query SQL manuale).
async function setAdmin(id, isAdminFlag) {
  const { data, error } = await dbClient
    .from(TABLE)
    .update({ is_admin: isAdminFlag })
    .eq('id', id)
    .select('id, name, email, is_admin, created_at')
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function count() {
  const { count: total, error } = await dbClient.from(TABLE).select('*', { count: 'exact', head: true });
  if (error) throw error;
  return total || 0;
}

module.exports = { create, findById, isAdmin, listAll, setAdmin, count };
