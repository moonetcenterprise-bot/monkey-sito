const { dbClient } = require('../config/supabaseClient');

const TABLE = 'favorites';

async function list(userId) {
  const { data, error } = await dbClient.from(TABLE).select('product_id').eq('user_id', userId);
  if (error) throw error;
  return data.map((r) => r.product_id);
}

async function add(userId, productId) {
  const { error } = await dbClient
    .from(TABLE)
    .upsert({ user_id: userId, product_id: productId }, { onConflict: 'user_id,product_id' });
  if (error) throw error;
  return list(userId);
}

async function remove(userId, productId) {
  const { error } = await dbClient
    .from(TABLE)
    .delete()
    .eq('user_id', userId)
    .eq('product_id', productId);
  if (error) throw error;
  return list(userId);
}

async function toggle(userId, productId) {
  const current = await list(userId);
  if (current.includes(productId)) return remove(userId, productId);
  return add(userId, productId);
}

// Per la Panoramica admin: quante volte ogni prodotto è stato aggiunto ai
// preferiti, ordinato dal più popolare. Il catalogo è piccolo, quindi si
// aggrega in JS invece di scrivere una query SQL con group by dedicata.
async function countsByProduct() {
  const { data, error } = await dbClient.from(TABLE).select('product_id');
  if (error) throw error;
  const counts = new Map();
  for (const row of data) {
    counts.set(row.product_id, (counts.get(row.product_id) || 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([productId, count]) => ({ productId, count }))
    .sort((a, b) => b.count - a.count);
}

module.exports = { list, add, remove, toggle, countsByProduct };
