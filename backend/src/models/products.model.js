const { dbClient } = require('../config/supabaseClient');

const TABLE = 'products';

// La tabella Postgres usa colonne "piatte" snake_case (title_it, title_en, ...).
// Il front end (data.js / le schermate .dc.html) si aspetta invece la stessa
// forma che usava con localStorage: { title: {it, en}, tagline: {it, en}, ... }.
// Questi due helper fanno da traduttore, così il resto dell'app (e il front end)
// non deve cambiare struttura dati.
function toApi(row) {
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    category: row.category,
    price: Number(row.price),
    oldPrice: row.old_price != null ? Number(row.old_price) : undefined,
    pages: row.pages,
    age: row.age,
    rating: row.rating != null ? Number(row.rating) : null,
    reviewsCount: row.reviews_count,
    badge: row.badge,
    order: row.sort_order,
    // Nome mantenuto "imageDataUrl" per compatibilità con i template esistenti,
    // che lo usano direttamente come <img src="...">: ora contiene l'URL
    // pubblico del file su Supabase Storage invece di un base64.
    imageDataUrl: row.image_url,
    // Link Amazon personalizzato impostato dall'admin per questo prodotto.
    // Se vuoto/assente, il front end ricade sul link di ricerca generato
    // automaticamente dal titolo (comportamento precedente).
    amazonUrl: row.amazon_url || null,
    title: { it: row.title_it, en: row.title_en },
    tagline: { it: row.tagline_it, en: row.tagline_en },
    description: { it: row.description_it, en: row.description_en }
  };
}

function toRow(product) {
  const row = {};
  if (product.slug !== undefined) row.slug = product.slug;
  if (product.category !== undefined) row.category = product.category;
  if (product.price !== undefined) row.price = product.price;
  if (product.oldPrice !== undefined) row.old_price = product.oldPrice;
  if (product.pages !== undefined) row.pages = product.pages;
  if (product.age !== undefined) row.age = product.age;
  if (product.rating !== undefined) row.rating = product.rating;
  if (product.reviewsCount !== undefined) row.reviews_count = product.reviewsCount;
  if (product.badge !== undefined) row.badge = product.badge;
  if (product.order !== undefined) row.sort_order = product.order;
  if (product.imageDataUrl !== undefined) row.image_url = product.imageDataUrl;
  if (product.amazonUrl !== undefined) row.amazon_url = product.amazonUrl;
  if (product.title !== undefined) {
    if (product.title.it !== undefined) row.title_it = product.title.it;
    if (product.title.en !== undefined) row.title_en = product.title.en;
  }
  if (product.tagline !== undefined) {
    if (product.tagline.it !== undefined) row.tagline_it = product.tagline.it;
    if (product.tagline.en !== undefined) row.tagline_en = product.tagline.en;
  }
  if (product.description !== undefined) {
    if (product.description.it !== undefined) row.description_it = product.description.it;
    if (product.description.en !== undefined) row.description_en = product.description.en;
  }
  return row;
}

async function findAll() {
  const { data, error } = await dbClient.from(TABLE).select('*').order('sort_order', { ascending: true });
  if (error) throw error;
  return data.map(toApi);
}

async function findBySlug(slug) {
  const { data, error } = await dbClient.from(TABLE).select('*').eq('slug', slug).maybeSingle();
  if (error) throw error;
  return toApi(data);
}

async function findById(id) {
  const { data, error } = await dbClient.from(TABLE).select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return toApi(data);
}

async function create(product) {
  const row = toRow(product);
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

async function reorder(orderedIds) {
  // Aggiorna sort_order in base alla posizione dell'id nell'array ricevuto.
  const updates = orderedIds.map((id, index) =>
    dbClient.from(TABLE).update({ sort_order: index }).eq('id', id)
  );
  const results = await Promise.all(updates);
  const failed = results.find((r) => r.error);
  if (failed) throw failed.error;
  return findAll();
}

module.exports = { findAll, findBySlug, findById, create, update, remove, reorder, toApi };
