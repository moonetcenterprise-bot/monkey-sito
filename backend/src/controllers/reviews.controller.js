const reviewsModel = require('../models/reviews.model');
const productsModel = require('../models/products.model');
const { dbClient } = require('../config/supabaseClient');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

// GET /api/products/:slug/reviews — pubblico, solo recensioni approvate
const listForProduct = asyncHandler(async (req, res) => {
  const product = await productsModel.findBySlug(req.params.slug);
  if (!product) throw new ApiError(404, 'Prodotto non trovato');
  const reviews = await reviewsModel.findApprovedByProductId(product.id);
  res.json(reviews);
});

// POST /api/products/:slug/reviews — utente autenticato, resta in attesa di moderazione
const createForProduct = asyncHandler(async (req, res) => {
  const product = await productsModel.findBySlug(req.params.slug);
  if (!product) throw new ApiError(404, 'Prodotto non trovato');

  const { data: profile } = await dbClient.from('profiles').select('name').eq('id', req.user.id).maybeSingle();
  const authorName = (profile && profile.name) || req.user.email.split('@')[0];

  const review = await reviewsModel.create({
    productId: product.id,
    userId: req.user.id,
    authorName,
    rating: req.body.rating,
    body: req.body.body
  });
  res.status(201).json(review);
});

// GET /api/admin/reviews — solo admin, tutte (approvate e in attesa)
const listAll = asyncHandler(async (req, res) => {
  const reviews = await reviewsModel.findAll();
  res.json(reviews);
});

// PUT /api/admin/reviews/:id { approved } — solo admin
const moderate = asyncHandler(async (req, res) => {
  const review = await reviewsModel.setApproved(Number(req.params.id), req.body.approved);
  res.json(review);
});

// DELETE /api/admin/reviews/:id — solo admin
const remove = asyncHandler(async (req, res) => {
  await reviewsModel.remove(Number(req.params.id));
  res.status(204).send();
});

module.exports = { listForProduct, createForProduct, listAll, moderate, remove };
