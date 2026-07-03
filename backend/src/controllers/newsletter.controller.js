const newsletterModel = require('../models/newsletter.model');
const asyncHandler = require('../utils/asyncHandler');

// POST /api/newsletter/subscribe — pubblico
// Risponde sempre con successo (anche se l'email è già iscritta) per non
// rivelare quali indirizzi sono già presenti nella lista.
const subscribe = asyncHandler(async (req, res) => {
  await newsletterModel.subscribe(req.body.email, req.body.locale);
  res.status(201).json({ ok: true });
});

module.exports = { subscribe };
