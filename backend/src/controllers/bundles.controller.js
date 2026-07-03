const bundlesModel = require('../models/bundles.model');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/bundles — pubblico, solo pacchetti attivi
const listActive = asyncHandler(async (req, res) => {
  const bundles = await bundlesModel.findAllActive();
  res.json(bundles);
});

module.exports = { listActive };
