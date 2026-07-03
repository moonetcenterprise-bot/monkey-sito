const { dbClient } = require('../config/supabaseClient');

const TABLE = 'bundles';

function toApi(row) {
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    title: { it: row.title_it, en: row.title_en },
    productIds: row.product_ids || [],
    discountPct: row.discount_pct != null ? Number(row.discount_pct) : 0,
    imageUrl: row.image_url || null,
    active: row.active,
    order: row.sort_order
  };
}

function toRow(bundle) {
  const row = {};
  if (bundle.slug !== undefined) row.slug = bundle.slug;
  if (bundle.title !== undefined) {
    if (bundle.title.it !== undefined) row.title_it = bundle.title.it;
    if (bundle.title.en !== undefined) row.title_en = bundle.title.en;
  }
  if (bundle.productIds !== undefined) row.product_ids = bundle.productIds;
  if (bundle.discountPct !== undefined) row.discount_pct = bundle.discountPct;
  if (bundle.imageUrl !== undefined) row.image_url = bundle.imageUrl;
  if (bundle.active !== undefined) row.active = bundle.active;
  if (bundle.order !== undefined) row.sort_order = bundle.order;
  return row;
}

async function findAllActive() {
  const { data, error } = await dbClient
    .from(TABLE)
    .select('*')
    .eq('active', true)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return data.map(toApi);
}

async function findAll() {
  const { data, error } = await dbClient.from(TABLE).select('*').order('sort_order', { ascending: true });
  if (error) throw error;
  return data.map(toApi);
}

async function findById(id) {
  const { data, error } = await dbClient.from(TABLE).select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return toApi(data);
}

async function create(bundle) {
  const row = toRow(bundle);
  const { data, error } = await dbClient.from(TABLE).insert(row).select('*').single();
  if (error) throw error;
  return toApi(data);
}

async function update(id, patch) {
  const row = toRow(patch);
  const { data, error } = await dbClient.from(TABLE).update(row).eq('id', id).select('*').single();
  if (error) throw error;
  return toApi(data);
}

async function remove(id) {
  const { error } = await dbClient.from(TABLE).delete().eq('id', id);
  if (error) throw error;
}

module.exports = { findAllActive, findAll, findById, create, update, remove, toApi };
