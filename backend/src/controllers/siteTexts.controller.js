const siteTextsModel = require('../models/siteTexts.model');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/site-texts — pubblico
const getSiteTexts = asyncHandler(async (req, res) => {
  const texts = await siteTextsModel.get();
  res.json(texts);
});

// PUT /api/site-texts — solo admin
const saveSiteTexts = asyncHandler(async (req, res) => {
  const texts = await siteTextsModel.save(req.body);
  res.json(texts);
});

module.exports = { getSiteTexts, saveSiteTexts };
