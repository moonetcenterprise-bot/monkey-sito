const pageLayoutModel = require('../models/pageLayout.model');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

// GET /api/page-layout/:page — pubblico
const getPageLayout = asyncHandler(async (req, res) => {
  const { page } = req.params;
  if (!pageLayoutModel.isValidPage(page)) {
    throw new ApiError(404, `Layout non trovato per la pagina "${page}"`);
  }
  const layout = await pageLayoutModel.get(page);
  res.json(layout);
});

// PUT /api/page-layout/:page — solo admin
const savePageLayout = asyncHandler(async (req, res) => {
  const { page } = req.params;
  if (!pageLayoutModel.isValidPage(page)) {
    throw new ApiError(404, `Layout non trovato per la pagina "${page}"`);
  }
  const layout = await pageLayoutModel.save(page, req.body);
  res.json(layout);
});

module.exports = { getPageLayout, savePageLayout };
