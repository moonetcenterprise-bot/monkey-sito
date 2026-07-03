const profilesModel = require('../models/profiles.model');
const productsModel = require('../models/products.model');
const favoritesModel = require('../models/favorites.model');
const reviewsModel = require('../models/reviews.model');
const bundlesModel = require('../models/bundles.model');
const newsletterModel = require('../models/newsletter.model');
const postsModel = require('../models/posts.model');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

// GET /api/admin/users — solo admin
const listUsers = asyncHandler(async (req, res) => {
  const users = await profilesModel.listAll();
  res.json(
    users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      isAdmin: u.is_admin,
      createdAt: u.created_at
    }))
  );
});

// PUT /api/admin/users/:id { isAdmin: boolean } — solo admin
// Sostituisce la query SQL manuale per promuovere/rimuovere un amministratore.
const updateUserAdmin = asyncHandler(async (req, res) => {
  const { isAdmin } = req.body;
  if (typeof isAdmin !== 'boolean') throw new ApiError(400, 'Il campo isAdmin deve essere true o false');

  const updated = await profilesModel.setAdmin(req.params.id, isAdmin);
  if (!updated) throw new ApiError(404, 'Utente non trovato');

  res.json({
    id: updated.id,
    name: updated.name,
    email: updated.email,
    isAdmin: updated.is_admin,
    createdAt: updated.created_at
  });
});

// GET /api/admin/stats — solo admin
// Il sito non ha un vero checkout (il carrello porta ad Amazon), quindi non
// esistono "ordini" da riportare: la panoramica mostra i dati realmente
// disponibili — utenti registrati, catalogo, e i prodotti più aggiunti ai
// preferiti come proxy dell'interesse dei visitatori.
const getStats = asyncHandler(async (req, res) => {
  const [totalUsers, products, favoriteCounts] = await Promise.all([
    profilesModel.count(),
    productsModel.findAll(),
    favoritesModel.countsByProduct()
  ]);

  const productsByCategory = products.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1;
    return acc;
  }, {});

  const productById = new Map(products.map((p) => [p.id, p]));
  const topFavorites = favoriteCounts.slice(0, 5).map(({ productId, count }) => {
    const product = productById.get(productId);
    return {
      productId,
      title: product ? product.title.it : `#${productId}`,
      count
    };
  });

  res.json({
    totalUsers,
    totalProducts: products.length,
    productsByCategory,
    topFavorites
  });
});

// ---------- RECENSIONI ----------

// GET /api/admin/reviews — solo admin, tutte (approvate e in attesa)
const listReviews = asyncHandler(async (req, res) => {
  const reviews = await reviewsModel.findAll();
  res.json(reviews);
});

// PUT /api/admin/reviews/:id { approved } — solo admin
const moderateReview = asyncHandler(async (req, res) => {
  if (typeof req.body.approved !== 'boolean') throw new ApiError(400, 'Il campo approved deve essere true o false');
  const review = await reviewsModel.setApproved(Number(req.params.id), req.body.approved);
  res.json(review);
});

// DELETE /api/admin/reviews/:id — solo admin
const deleteReview = asyncHandler(async (req, res) => {
  await reviewsModel.remove(Number(req.params.id));
  res.status(204).send();
});

// ---------- BUNDLE / PACCHETTI REGALO ----------

// GET /api/admin/bundles — solo admin, tutti (attivi e non)
const listBundlesAdmin = asyncHandler(async (req, res) => {
  const bundles = await bundlesModel.findAll();
  res.json(bundles);
});

// POST /api/admin/bundles — solo admin
const createBundle = asyncHandler(async (req, res) => {
  const bundle = await bundlesModel.create(req.body);
  res.status(201).json(bundle);
});

// PUT /api/admin/bundles/:id — solo admin
const updateBundle = asyncHandler(async (req, res) => {
  const existing = await bundlesModel.findById(Number(req.params.id));
  if (!existing) throw new ApiError(404, 'Pacchetto non trovato');
  const bundle = await bundlesModel.update(Number(req.params.id), req.body);
  res.json(bundle);
});

// DELETE /api/admin/bundles/:id — solo admin
const deleteBundle = asyncHandler(async (req, res) => {
  await bundlesModel.remove(Number(req.params.id));
  res.status(204).send();
});

// ---------- NEWSLETTER ----------

// GET /api/admin/newsletter — solo admin
const listNewsletter = asyncHandler(async (req, res) => {
  const subscribers = await newsletterModel.findAll();
  res.json({ count: subscribers.length, subscribers });
});

// ---------- BLOG ----------

// GET /api/admin/posts — solo admin, tutti (pubblicati e bozze)
const listPostsAdmin = asyncHandler(async (req, res) => {
  const posts = await postsModel.findAll();
  res.json(posts);
});

// POST /api/admin/posts — solo admin
const createPost = asyncHandler(async (req, res) => {
  const post = await postsModel.create(req.body);
  res.status(201).json(post);
});

// PUT /api/admin/posts/:id — solo admin
const updatePost = asyncHandler(async (req, res) => {
  const existing = await postsModel.findById(Number(req.params.id));
  if (!existing) throw new ApiError(404, 'Articolo non trovato');
  const post = await postsModel.update(Number(req.params.id), req.body);
  res.json(post);
});

// DELETE /api/admin/posts/:id — solo admin
const deletePost = asyncHandler(async (req, res) => {
  await postsModel.remove(Number(req.params.id));
  res.status(204).send();
});

module.exports = {
  listUsers, updateUserAdmin, getStats,
  listReviews, moderateReview, deleteReview,
  listBundlesAdmin, createBundle, updateBundle, deleteBundle,
  listNewsletter,
  listPostsAdmin, createPost, updatePost, deletePost
};
