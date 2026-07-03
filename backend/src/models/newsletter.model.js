const { dbClient } = require('../config/supabaseClient');

const TABLE = 'newsletter_subscribers';

function toApi(row) {
  if (!row) return null;
  return { id: row.id, email: row.email, locale: row.locale, createdAt: row.created_at };
}

async function subscribe(email, locale) {
  const { data, error } = await dbClient
    .from(TABLE)
    .upsert({ email: email.toLowerCase().trim(), locale: locale || 'it' }, { onConflict: 'email', ignoreDuplicates: true })
    .select('*')
    .maybeSingle();
  if (error) throw error;
  return toApi(data);
}

async function findAll() {
  const { data, error } = await dbClient.from(TABLE).select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(toApi);
}

module.exports = { subscribe, findAll };
