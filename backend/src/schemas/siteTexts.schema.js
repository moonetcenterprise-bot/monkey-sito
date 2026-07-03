const { z } = require('zod');

// Contenuto libero ma tipizzato come oggetto: la struttura interna (hero/about)
// viene unita (deep merge) a quella esistente lato modello, quindi qui
// validiamo solo che sia un oggetto JSON valido.
const siteTextsSchema = z.record(z.any());

module.exports = { siteTextsSchema };
