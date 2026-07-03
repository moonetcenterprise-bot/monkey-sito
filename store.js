// Monkey — shared client-side store: language + cart (localStorage-backed)
const LANG_KEY = 'monkey_lang';
const CART_KEY = 'monkey_cart';

export function detectInitialLang() {
  try {
    const stored = localStorage.getItem(LANG_KEY);
    if (stored === 'it' || stored === 'en') return stored;
  } catch (e) {}
  try {
    const nav = (navigator.language || 'it').toLowerCase();
    if (nav.startsWith('en')) return 'en';
  } catch (e) {}
  return 'it';
}

export function getLang() {
  try {
    return localStorage.getItem(LANG_KEY) || detectInitialLang();
  } catch (e) {
    return 'it';
  }
}

export function setLang(lang) {
  try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
}

export function getCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (e) {
    return [];
  }
}

export function saveCart(items) {
  try { localStorage.setItem(CART_KEY, JSON.stringify(items)); } catch (e) {}
}

export function addToCart(items, productId, qty) {
  qty = qty || 1;
  const next = items.slice();
  const existing = next.find(it => it.id === productId);
  if (existing) {
    existing.qty += qty;
  } else {
    next.push({ id: productId, qty: qty });
  }
  saveCart(next);
  return next;
}

export function removeFromCart(items, productId) {
  const next = items.filter(it => it.id !== productId);
  saveCart(next);
  return next;
}

export function setQty(items, productId, qty) {
  const next = items.slice();
  const existing = next.find(it => it.id === productId);
  if (!existing) return items;
  if (qty <= 0) return removeFromCart(items, productId);
  existing.qty = qty;
  saveCart(next);
  return next;
}

export function cartCount(items) {
  return items.reduce((sum, it) => sum + it.qty, 0);
}

export function cartTotal(items, products) {
  return items.reduce((sum, it) => {
    const p = products.find(pr => pr.id === it.id);
    return p ? sum + p.price * it.qty : sum;
  }, 0);
}

export function formatPrice(value, lang) {
  const v = value.toFixed(2);
  if (lang === 'en') {
    return '€' + v;
  }
  return v.replace('.', ',') + ' €';
}

export function amazonSearchUrl(title) {
  return 'https://www.amazon.it/s?k=' + encodeURIComponent('Monkey ' + title);
}
