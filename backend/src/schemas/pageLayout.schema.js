const { z } = require('zod');

// Contenuto libero (lista di blocchi con stile+testi): la struttura interna
// viene validata solo come oggetto JSON valido, come già fatto per i testi
// del sito — il dettaglio dei campi per tipo di blocco è gestito lato modello.
const pageLayoutSchema = z.object({
  blocks: z.array(z.record(z.any()))
});

module.exports = { pageLayoutSchema };
