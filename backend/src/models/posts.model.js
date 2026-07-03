const { dbClient } = require('../config/supabaseClient');

const TABLE = 'posts';

function toApi(row) {
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    title: { it: row.title_it, en: row.title_en },
    excerpt: { it: row.excerpt_it, en: row.excerpt_en },
    body: { it: row.body_it, en: row.body_en },
    coverImage: row.cover_image || null,
    published: row.published,
    publishedAt: row.published_at
  };
}

function toRow(post) {
  const row = {};
  if (post.slug !== undefined) row.slug = post.slug;
  if (post.title !== undefined) {
    if (post.title.it !== undefined) row.title_it = post.title.it;
    if (post.title.en !== undefined) row.title_en = post.title.en;
  }
  if (post.excerpt !== undefined) {
    if (post.excerpt.it !== undefined) row.excerpt_it = post.excerpt.it;
    if (post.excerpt.en !== undefined) row.excerpt_en = post.excerpt.en;
  }
  if (post.body !== undefined) {
    if (post.body.it !== undefined) row.body_it = post.body.it;
    if (post.body.en !== undefined) row.body_en = post.body.en;
  }
  if (post.coverImage !== undefined) row.cover_image = post.coverImage;
  if (post.published !== undefined) {
    row.published = post.published;
    row.published_at = post.published ? new Date().toISOString() : null;
  }
  return row;
}

async function findAllPublished() {
  const { data, error } = await dbClient
    .from(TABLE)
    .select('*')
    .eq('published', true)
    .order('published_at', { ascending: false });
  if (error) throw error;
  return data.map(toApi);
}

async function findPublishedBySlug(slug) {
  const { data, error } = await dbClient.from(TABLE).select('*').eq('slug', slug).eq('published', true).maybeSingle();
  if (error) throw error;
  return toApi(data);
}

async function findAll() {
  const { data, error } = await dbClient.from(TABLE).select('*').order('id', { ascending: false });
  if (error) throw error;
  return data.map(toApi);
}

async function findById(id) {
  const { data, error } = await dbClient.from(TABLE).select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return toApi(data);
}

async function create(post) {
  const row = toRow(post);
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

module.exports = { findAllPublished, findPublishedBySlug, findAll, findById, create, update, remove, toApi };
