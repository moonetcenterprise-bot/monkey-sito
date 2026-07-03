const { dbClient } = require('../config/supabaseClient');

const TABLE = 'reviews';

function toApi(row) {
  if (!row) return null;
  return {
    id: row.id,
    productId: row.product_id,
    authorName: row.author_name,
    rating: row.rating,
    body: row.body,
    approved: row.approved,
    createdAt: row.created_at
  };
}

async function findApprovedByProductId(productId) {
  const { data, error } = await dbClient
    .from(TABLE)
    .select('*')
    .eq('product_id', productId)
    .eq('approved', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(toApi);
}

async function findAll() {
  const { data, error } = await dbClient.from(TABLE).select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(toApi);
}

async function create({ productId, userId, authorName, rating, body }) {
  const { data, error } = await dbClient
    .from(TABLE)
    .insert({ product_id: productId, user_id: userId, author_name: authorName, rating, body, approved: false })
    .select('*')
    .single();
  if (error) throw error;
  return toApi(data);
}

async function setApproved(id, approved) {
  const { data, error } = await dbClient.from(TABLE).update({ approved }).eq('id', id).select('*').single();
  if (error) throw error;
  return toApi(data);
}

async function remove(id) {
  const { error } = await dbClient.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}

module.exports = { findApprovedByProductId, findAll, create, setApproved, remove, toApi };
