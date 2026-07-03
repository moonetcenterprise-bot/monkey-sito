const postsModel = require('../models/posts.model');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

// GET /api/posts — pubblico, solo pubblicati
const listPublished = asyncHandler(async (req, res) => {
  const posts = await postsModel.findAllPublished();
  res.json(posts);
});

// GET /api/posts/:slug — pubblico, solo pubblicati
const getPublished = asyncHandler(async (req, res) => {
  const post = await postsModel.findPublishedBySlug(req.params.slug);
  if (!post) throw new ApiError(404, 'Articolo non trovato');
  res.json(post);
});

module.exports = { listPublished, getPublished };
