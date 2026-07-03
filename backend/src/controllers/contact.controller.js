const { sendContactEmail } = require('../utils/mailer');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');

// POST /api/contact — pubblico
const sendContact = asyncHandler(async (req, res) => {
  const { name, email, message } = req.body;
  try {
    await sendContactEmail({ name, email, message });
  } catch (err) {
    throw new ApiError(502, `Invio email non riuscito: ${err.message}`);
  }
  res.status(202).json({ ok: true });
});

module.exports = { sendContact };
