const productsModel = require('../models/products.model');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

// GET /api/products — pubblico
const listProducts = asyncHandler(async (req, res) => {
  const products = await productsModel.findAll();
  res.json(products);
});

// GET /api/products/:slug — pubblico
const getProduct = asyncHandler(async (req, res) => {
  const product = await productsModel.findBySlug(req.params.slug);
  if (!product) throw new ApiError(404, 'Prodotto non trovato');
  res.json(product);
});

// POST /api/products — solo admin
const createProduct = asyncHandler(async (req, res) => {
  const product = await productsModel.create(req.body);
  res.status(201).json(product);
});

// PUT /api/products/:id — solo admin
const updateProduct = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = await productsModel.findById(id);
  if (!existing) throw new ApiError(404, 'Prodotto non trovato');
  const product = await productsModel.update(id, req.body);
  res.json(product);
});

// DELETE /api/products/:id — solo admin
const deleteProduct = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  await productsModel.remove(id);
  res.status(204).send();
});

// POST /api/products/reorder — solo admin
const reorderProducts = asyncHandler(async (req, res) => {
  const products = await productsModel.reorder(req.body.orderedIds);
  res.json(products);
});

module.exports = { listProducts, getProduct, createProduct, updateProduct, deleteProduct, reorderProducts };
