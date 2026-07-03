const favoritesModel = require('../models/favorites.model');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

// GET /api/favorites — richiede requireAuth
const listFavorites = asyncHandler(async (req, res) => {
  const ids = await favoritesModel.list(req.user.id);
  res.json(ids);
});

// POST /api/favorites/toggle { productId } — richiede requireAuth
const toggleFavorite = asyncHandler(async (req, res) => {
  const productId = Number(req.body.productId);
  if (!Number.isFinite(productId)) throw new ApiError(400, 'productId non valido');
  const ids = await favoritesModel.toggle(req.user.id, productId);
  res.json(ids);
});

module.exports = { listFavorites, toggleFavorite };
