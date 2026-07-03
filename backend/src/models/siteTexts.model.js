const { dbClient } = require('../config/supabaseClient');

const TABLE = 'site_texts';
const ROW_ID = 1; // riga singleton: un solo record contiene tutto il JSON dei testi

const DEFAULT_CONTENT = {
  hero: {
    kicker: { it: 'Libri da colorare Monkey', en: 'Monkey coloring books' },
    title1: { it: 'Un colore alla volta,', en: 'One color at a time,' },
    title2: { it: 'per ogni età.', en: 'for every age.' },
    subtitle: {
      it: 'Libri da colorare pensati per bambini, adolescenti e adulti: per giocare, esprimersi e staccare la mente, una matita alla volta.',
      en: 'Coloring books made for kids, teens and adults: to play, express yourself and unplug — one pencil at a time.'
    }
  },
  about: {
    title: { it: 'Crediamo nel potere di una matita', en: 'We believe in the power of a pencil' },
    body: {
      it: 'Monkey nasce dall’idea che colorare non sia solo un gioco da bambini: è un momento di pausa, concentrazione e leggerezza per tutta la famiglia. Disegniamo ogni libro a mano, pensando a chi lo riempirà di colore — dai più piccoli ai più grandi.',
      en: 'Monkey was born from the idea that coloring isn’t just for kids — it’s a moment of pause, focus and lightness for the whole family. We draw every book by hand, thinking of whoever will fill it with color, from the youngest to the oldest.'
    }
  },
  // Banner promozionale mostrato in cima al sito (facoltativo). Il codice
  // sconto va creato manualmente su Amazon Seller Central: qui serve solo
  // a mostrarlo ai visitatori, non viene applicato automaticamente.
  promoBanner: {
    active: false,
    code: '',
    text: { it: '', en: '' }
  }
};

function deepMerge(base, overrides) {
  const out = Array.isArray(base) ? base.slice() : Object.assign({}, base);
  for (const key in overrides) {
    if (overrides[key] && typeof overrides[key] === 'object' && !Array.isArray(overrides[key]) && base[key]) {
      out[key] = deepMerge(base[key], overrides[key]);
    } else {
      out[key] = overrides[key];
    }
  }
  return out;
}

async function get() {
  const { data, error } = await dbClient.from(TABLE).select('content').eq('id', ROW_ID).maybeSingle();
  if (error) throw error;
  if (!data) return DEFAULT_CONTENT;
  return deepMerge(DEFAULT_CONTENT, data.content || {});
}

async function save(partial) {
  const current = await get();
  const next = deepMerge(current, partial);
  const { error } = await dbClient
    .from(TABLE)
    .upsert({ id: ROW_ID, content: next, updated_at: new Date().toISOString() });
  if (error) throw error;
  return next;
}

module.exports = { get, save, DEFAULT_CONTENT };
