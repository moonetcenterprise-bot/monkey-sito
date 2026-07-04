const { dbClient } = require('../config/supabaseClient');

const TABLE = 'page_layout';

// Layout di default per la pagina "home": riproduce esattamente l'aspetto
// attuale del sito, così finché l'admin non modifica nulla dall'Editor
// visivo la pagina resta identica a oggi. Ogni blocco ha:
// - style: colori, font, spaziatura verticale, angoli, larghezza contenuto
// - content: testi (it/en) del blocco
const DEFAULT_LAYOUTS = {
  home: {
    blocks: [
      {
        id: 'hero',
        type: 'hero',
        order: 0,
        style: { bg: '#FFFCF7', textColor: '#3D2A1B', accentColor: '#FF6F59', font: 'baloo', paddingY: 'large', radius: 30, width: 'wide' },
        content: {
          kicker: { it: 'Libri da colorare Monkey', en: 'Monkey coloring books' },
          title1: { it: 'Un colore alla volta,', en: 'One color at a time,' },
          title2: { it: 'per ogni età.', en: 'for every age.' },
          subtitle: {
            it: 'Libri da colorare pensati per bambini, adolescenti e adulti: per giocare, esprimersi e staccare la mente, una matita alla volta.',
            en: 'Coloring books made for kids, teens and adults: to play, express yourself and unplug — one pencil at a time.'
          },
          ctaPrimary: { it: 'Scopri la collezione', en: 'Discover the collection' },
          ctaSecondary: { it: 'Idea regalo', en: 'Gift ideas' },
          badge: { it: 'Spedizione in tutta Italia', en: 'Shipping across Italy' }
        }
      },
      {
        id: 'valueProps',
        type: 'valueProps',
        order: 1,
        style: { bg: '#FFFCF7', textColor: '#3D2A1B', accentColor: '#FBEFDD', font: 'baloo', paddingY: 'medium', radius: 14, width: 'wide' },
        content: {
          v1t: { it: 'Carta di qualità', en: 'Quality paper' },
          v1d: { it: '180g, perfetta per pastelli e pennarelli', en: '180gsm, perfect for pencils and markers' },
          v2t: { it: 'Disegni originali', en: 'Original artwork' },
          v2d: { it: 'Illustrati dal nostro studio', en: 'Hand-illustrated by our studio' },
          v3t: { it: 'Per tutte le età', en: 'For all ages' },
          v3d: { it: 'Da 4 anni in su, fino agli adulti', en: 'From age 4 up to adults' },
          v4t: { it: 'Pensati per il relax', en: 'Made to relax' },
          v4d: { it: 'Pagine pensate per staccare la mente', en: 'Pages designed to switch your mind off' }
        }
      },
      {
        id: 'about',
        type: 'about',
        order: 2,
        style: { bg: '#FFFCF7', textColor: '#3D2A1B', accentColor: '#FF6F59', font: 'baloo', paddingY: 'large', radius: 28, width: 'medium' },
        content: {
          kicker: { it: 'Chi siamo', en: 'About us' },
          title: { it: 'Crediamo nel potere di una matita', en: 'We believe in the power of a pencil' },
          body: {
            it: 'Monkey nasce dall’idea che colorare non sia solo un gioco da bambini: è un momento di pausa, concentrazione e leggerezza per tutta la famiglia. Disegniamo ogni libro a mano, pensando a chi lo riempirà di colore — dai più piccoli ai più grandi.',
            en: 'Monkey was born from the idea that coloring isn’t just for kids — it’s a moment of pause, focus and lightness for the whole family. We draw every book by hand, thinking of whoever will fill it with color, from the youngest to the oldest.'
          },
          stat2n: { it: '4.8/5', en: '4.8/5' },
          stat2l: { it: 'valutazione media', en: 'average rating' },
          stat3n: { it: '16', en: '16' },
          stat3l: { it: 'collezioni disponibili', en: 'collections available' }
        }
      },
      {
        id: 'reviews',
        type: 'reviews',
        order: 3,
        style: { bg: '#FFFCF7', textColor: '#3D2A1B', accentColor: '#FF6F59', font: 'baloo', paddingY: 'large', radius: 22, width: 'wide' },
        content: {
          title: { it: 'Cosa dicono le famiglie Monkey', en: 'What Monkey families say' },
          subtitle: { it: 'Recensioni vere da chi ha già colorato con noi', en: 'Real reviews from people who already colored with us' }
        }
      }
    ]
  },
  shop: {
    blocks: [
      {
        id: 'pageHeader',
        type: 'pageHeader',
        order: 0,
        style: { bg: '#F3ECE0', textColor: '#3D2A1B', accentColor: '#FF6F59', font: 'baloo', paddingY: 'medium', radius: 0, width: 'wide' },
        content: {
          title: { it: 'Il negozio', en: 'The shop' },
          subtitle: { it: 'Tutte le nostre collezioni da colorare, in un unico posto.', en: 'All our coloring collections, in one place.' }
        }
      }
    ]
  },
  product: {
    blocks: [
      {
        id: 'productDetail',
        type: 'productDetail',
        order: 0,
        // I testi (titolo, prezzo, descrizione...) restano quelli del singolo
        // libro, gestiti dal Catalogo prodotti: qui si controlla solo
        // l'aspetto della sezione di dettaglio (sfondo, font, spaziatura).
        style: { bg: '#FFFCF7', textColor: '#3D2A1B', accentColor: '#FF6F59', font: 'baloo', paddingY: 'medium', radius: 28, width: 'wide' },
        content: {}
      },
      {
        id: 'related',
        type: 'related',
        order: 1,
        style: { bg: '#FFFCF7', textColor: '#3D2A1B', accentColor: '#FF6F59', font: 'baloo', paddingY: 'medium', radius: 22, width: 'wide' },
        content: {
          title: { it: 'Potrebbero piacerti anche', en: 'You might also like' }
        }
      },
      {
        id: 'reviews',
        type: 'reviews',
        order: 2,
        style: { bg: '#FFFCF7', textColor: '#3D2A1B', accentColor: '#FF6F59', font: 'baloo', paddingY: 'medium', radius: 22, width: 'wide' },
        content: {
          title: { it: 'Recensioni dei clienti', en: 'Customer reviews' },
          emptyLabel: { it: 'Nessuna recensione ancora. Sii il primo a lasciarne una!', en: 'No reviews yet. Be the first to leave one!' }
        }
      }
    ]
  }
};

const VALID_PAGES = Object.keys(DEFAULT_LAYOUTS);

function isValidPage(page) {
  return VALID_PAGES.includes(page);
}

// Unione semplice: se l'admin ha salvato un layout, lo usiamo per intero
// (i blocchi vengono sempre salvati come lista completa dal front end, non
// a pezzi), altrimenti torniamo il default che riproduce il sito attuale.
async function get(page) {
  const { data, error } = await dbClient.from(TABLE).select('content').eq('page', page).maybeSingle();
  if (error) throw error;
  if (!data || !data.content || !Array.isArray(data.content.blocks) || data.content.blocks.length === 0) {
    return DEFAULT_LAYOUTS[page];
  }
  return data.content;
}

async function save(page, content) {
  const { error } = await dbClient
    .from(TABLE)
    .upsert({ page, content, updated_at: new Date().toISOString() }, { onConflict: 'page' });
  if (error) throw error;
  return get(page);
}

module.exports = { get, save, isValidPage, VALID_PAGES, DEFAULT_LAYOUTS };
