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
    // Fino a 4 immagini di anteprima (disegni interni al libro) scelte
    // dall'admin. Sempre un array (mai null/undefined) così il front end
    // può testare direttamente la lunghezza senza controlli extra.
    previewImages: Array.isArray(row.preview_images) ? row.preview_images.filter(Boolean) : [],
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
  if (product.previewImages !== undefined) row.preview_images = (product.previewImages || []).filter(Boolean);
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

// Numero minimo di recensioni approvate perché un prodotto sia considerato
// per il badge "bestseller" automatico: evita che un solo voto a 5 stelle
// batta prodotti con uno storico di recensioni più solido.
const BESTSELLER_MIN_REVIEWS = 3;
// Numero massimo di prodotti che possono mostrare il badge bestseller
// contemporaneamente (stesso comportamento del vecchio flag manuale).
const BESTSELLER_MAX_COUNT = 4;

// Calcola rating medio e conteggio recensioni APPROVATE per uno o più
// prodotti, in una sola query. Il voto/conteggio mostrato sul sito riflette
// sempre le recensioni reali lasciate dagli utenti: un prodotto senza
// recensioni approvate non mostra più stelle né conteggio, anche se in
// passato aveva un valore impostato manualmente su Supabase.
async function fetchReviewStats(productIds) {
  if (!productIds.length) return new Map();
  const { data, error } = await dbClient
    .from('reviews')
    .select('product_id, rating')
    .eq('approved', true)
    .in('product_id', productIds);
  if (error) throw error;

  const byProduct = new Map();
  for (const row of data) {
    const entry = byProduct.get(row.product_id) || { sum: 0, count: 0 };
    entry.sum += row.rating;
    entry.count += 1;
    byProduct.set(row.product_id, entry);
  }

  const stats = new Map();
  for (const [productId, { sum, count }] of byProduct.entries()) {
    stats.set(productId, { rating: sum / count, reviewsCount: count });
  }
  return stats;
}

// Sovrascrive rating/reviewsCount di un prodotto con i dati reali (o li
// azzera se non ci sono ancora recensioni approvate). Il campo "badge" viene
// gestito separatamente da assignBestsellerBadges, che ha bisogno di vedere
// tutti i prodotti insieme per stabilire una classifica.
function applyReviewStats(product, stats) {
  const s = stats.get(product.id);
  if (!s) return { ...product, rating: null, reviewsCount: 0 };
  return { ...product, rating: Math.round(s.rating * 10) / 10, reviewsCount: s.reviewsCount };
}

// Assegna automaticamente il badge "bestseller" ai migliori prodotti in
// classifica (tra quelli con almeno BESTSELLER_MIN_REVIEWS recensioni
// approvate, ordinati per rating medio decrescente), fino a un massimo di
// BESTSELLER_MAX_COUNT. Se un prodotto ha già un badge diverso e più
// specifico (es. "sale" per un'offerta attiva, "gift" per idea regalo),
// quel badge viene mantenuto e il prodotto non viene toccato: il bestseller
// automatico si applica solo dove non c'è già un badge manuale prioritario.
const MANUAL_PRIORITY_BADGES = new Set(['sale', 'gift']);

function assignBestsellerBadges(products) {
  const eligible = products
    .filter((p) => p.reviewsCount >= BESTSELLER_MIN_REVIEWS && !MANUAL_PRIORITY_BADGES.has(p.badge))
    .sort((a, b) => b.rating - a.rating)
    .slice(0, BESTSELLER_MAX_COUNT);
  const bestsellerIds = new Set(eligible.map((p) => p.id));

  return products.map((p) => {
    if (MANUAL_PRIORITY_BADGES.has(p.badge)) return p; // badge manuale prioritario intoccato
    if (bestsellerIds.has(p.id)) return { ...p, badge: 'bestseller' };
    if (p.badge === 'bestseller') return { ...p, badge: null }; // non più in classifica: rimuove il vecchio badge statico
    return p;
  });
}

async function findAll() {
  const { data, error } = await dbClient.from(TABLE).select('*').order('sort_order', { ascending: true });
  if (error) throw error;
  const products = data.map(toApi);
  const stats = await fetchReviewStats(products.map((p) => p.id));
  const withStats = products.map((p) => applyReviewStats(p, stats));
  return assignBestsellerBadges(withStats);
}

async function findBySlug(slug) {
  const { data, error } = await dbClient.from(TABLE).select('*').eq('slug', slug).maybeSingle();
  if (error) throw error;
  const product = toApi(data);
  if (!product) return null;
  const stats = await fetchReviewStats([product.id]);
  const withStats = applyReviewStats(product, stats);
  // Un singolo prodotto non può calcolare da solo la classifica bestseller
  // (serve confrontarlo con gli altri): mostra "bestseller" solo se era già
  // eleggibile secondo lo stesso criterio di soglia minima recensioni,
  // altrimenti nessun badge speciale su questa vista puntuale.
  if (MANUAL_PRIORITY_BADGES.has(withStats.badge)) return withStats;
  if (withStats.reviewsCount < BESTSELLER_MIN_REVIEWS && withStats.badge === 'bestseller') {
    return { ...withStats, badge: null };
  }
  return withStats;
}

async function findById(id) {
  const { data, error } = await dbClient.from(TABLE).select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  const product = toApi(data);
  if (!product) return null;
  const stats = await fetchReviewStats([product.id]);
  return applyReviewStats(product, stats);
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
