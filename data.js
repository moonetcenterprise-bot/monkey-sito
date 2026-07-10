// Monkey — data layer collegata al backend reale (Express + Supabase).
// Le firme delle funzioni esportate sono rimaste identiche a quelle della
// versione basata su localStorage: nessuna schermata .dc.html è stata
// riscritta, a parte Admin.dc.html (onLoginSubmit), perché adminLogin ora
// deve verificare le credenziali su un vero database ed è quindi asincrona.

// Imposta window.MONKEY_API_URL PRIMA di questo script (es. in un tag
// <script> nell'head della pagina) per puntare a un backend diverso da
// quello locale, ad esempio quando il sito è pubblicato online:
//   <script>window.MONKEY_API_URL = 'https://tuo-backend.onrender.com/api';</script>
const API_BASE_URL = (typeof window !== 'undefined' && window.MONKEY_API_URL) || 'http://localhost:4000/api';

const LS_SESSION = 'monkey_session_v1';
const LS_FAVORITES_PREFIX = 'monkey_favorites_v1_';
const LS_ADMIN_SESSION = 'monkey_admin_session_v1';

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch (e) {
    return fallback;
  }
}

function writeJSON(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
}

// Il backend e ospitato su un piano gratuito (Render) che mette in PAUSA il
// server dopo un periodo di inattivita. La prima richiesta di un visitatore
// "a freddo" puo quindi fallire con un errore di rete oppure ricevere un
// 502/503/504 dal proxy mentre il server si riavvia (cold start, anche
// 30-50 secondi). Senza ritentare, il catalogo resterebbe vuoto e il sito
// mostrerebbe i riquadri segnaposto al posto delle copertine dei libri e
// degli altri blocchi - proprio il bug per cui "le immagini non compaiono
// senza login" (chi fa login sveglia il backend, e da quel momento tutto si
// carica). Ritentiamo automaticamente le sole letture pubbliche (GET), che
// sono idempotenti, finche il server non risponde: cosi le immagini si
// vedono anche senza accesso.
const COLD_START_STATUSES = new Set([502, 503, 504]);
// Ritardi crescenti tra i tentativi (ms): coprono ~30s complessivi, di norma
// sufficienti a far ripartire un'istanza Render addormentata.
const RETRY_DELAYS_MS = [1000, 2000, 4000, 6000, 8000, 10000];

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function apiFetch(path, { method = 'GET', body, token, isForm = false } = {}) {
  const headers = {};
  if (!isForm) headers['Content-Type'] = 'application/json';
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = {
    method,
    headers,
    body: body === undefined ? undefined : (isForm ? body : JSON.stringify(body))
  };

  // Ritentiamo solo le GET: sono idempotenti, quindi ripeterle e sicuro. Le
  // scritture (POST/PUT/DELETE) NON vengono ritentate qui per non rischiare
  // effetti doppi (es. iscrizioni o messaggi duplicati) se la richiesta ha
  // in realta raggiunto il server.
  const retryable = method === 'GET';
  const maxAttempts = retryable ? RETRY_DELAYS_MS.length + 1 : 1;

  let lastNetworkError = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    let res;
    try {
      res = await fetch(`${API_BASE_URL}${path}`, options);
    } catch (networkError) {
      // fetch ha lanciato: server irraggiungibile o in fase di riavvio.
      lastNetworkError = networkError;
      if (attempt < maxAttempts - 1) {
        await delay(RETRY_DELAYS_MS[attempt]);
        continue;
      }
      throw networkError;
    }

    // Il server sta ancora ripartendo: riprova invece di arrendersi.
    if (COLD_START_STATUSES.has(res.status) && attempt < maxAttempts - 1) {
      await delay(RETRY_DELAYS_MS[attempt]);
      continue;
    }

    if (res.status === 204) return null;

    let payload = null;
    try { payload = await res.json(); } catch (e) { /* risposta vuota */ }

    if (!res.ok) {
      const message = (payload && payload.error) || `Richiesta fallita (${res.status})`;
      throw new Error(message);
    }
    return payload;
  }

  throw lastNetworkError || new Error('Richiesta fallita dopo vari tentativi');
}

function getSession() {
  return readJSON(LS_SESSION, null);
}

function setSession(session) {
  writeJSON(LS_SESSION, session);
}

function getAdminToken() {
  try { return sessionStorage.getItem(LS_ADMIN_SESSION) || null; } catch (e) { return null; }
}

// ---------- PRODUCTS (catalogo, admin-editable) ----------

export async function getProducts() {
  return apiFetch('/products');
}

export async function getProductBySlug(slug) {
  try {
    return await apiFetch(`/products/${encodeURIComponent(slug)}`);
  } catch (e) {
    return null;
  }
}

export async function saveProduct(updated) {
  await apiFetch(`/products/${updated.id}`, { method: 'PUT', body: updated, token: getAdminToken() });
  return getProducts();
}

export async function addProduct(partial) {
  const list = await getProducts();
  const defaults = {
    slug: 'nuovo-libro-' + Date.now(),
    category: 'kids',
    price: 9.90,
    pages: 32,
    age: '4-8',
    rating: 5,
    reviewsCount: 0,
    badge: 'new',
    order: list.length,
    imageDataUrl: null,
    amazonUrl: null,
    title: { it: 'Nuovo Libro', en: 'New Book' },
    tagline: { it: 'Descrizione breve', en: 'Short tagline' },
    description: { it: 'Descrizione completa del libro.', en: 'Full book description.' }
  };
  const payload = Object.assign({}, defaults, partial || {});
  return apiFetch('/products', { method: 'POST', body: payload, token: getAdminToken() });
}

export async function deleteProduct(id) {
  await apiFetch(`/products/${id}`, { method: 'DELETE', token: getAdminToken() });
  return getProducts();
}

export async function reorderProducts(orderedIds) {
  return apiFetch('/products/reorder', { method: 'POST', body: { orderedIds }, token: getAdminToken() });
}

export async function uploadProductImage(file) {
  const form = new FormData();
  form.append('image', file);
  const result = await apiFetch('/upload/product-image', {
    method: 'POST',
    body: form,
    token: getAdminToken(),
    isForm: true
  });
  return result.imageUrl;
}

// Carica un unico file .zip con fino a 4 immagini di anteprima del libro
// (ordinate per nome dentro lo zip) e restituisce l'elenco di URL pubblici,
// nello stesso ordine, così l'admin non deve caricarle una per una.
export async function uploadProductPreviewZip(file) {
  const form = new FormData();
  form.append('zip', file);
  const result = await apiFetch('/upload/product-preview-zip', {
    method: 'POST',
    body: form,
    token: getAdminToken(),
    isForm: true
  });
  return result.imageUrls;
}

export async function uploadLayoutImage(file) {
  const form = new FormData();
  form.append('image', file);
  const result = await apiFetch('/upload/layout-image', {
    method: 'POST',
    body: form,
    token: getAdminToken(),
    isForm: true
  });
  return result.imageUrl;
}

// ---------- SITE TEXTS (copy editabile da admin) ----------

export async function getSiteTexts() {
  return apiFetch('/site-texts');
}

export async function saveSiteTexts(partial) {
  return apiFetch('/site-texts', { method: 'PUT', body: partial, token: getAdminToken() });
}

// ---------- EDITOR VISIVO (layout a blocchi per pagina) ----------

export async function getPageLayout(page) {
  return apiFetch(`/page-layout/${encodeURIComponent(page)}`);
}

export async function savePageLayout(page, layout) {
  return apiFetch(`/page-layout/${encodeURIComponent(page)}`, {
    method: 'PUT',
    body: layout,
    token: getAdminToken()
  });
}

// ---------- RECENSIONI ----------

export async function getReviews(slug) {
  return apiFetch(`/products/${encodeURIComponent(slug)}/reviews`);
}

export async function addReview(slug, { rating, body }) {
  const session = getSession();
  return apiFetch(`/products/${encodeURIComponent(slug)}/reviews`, {
    method: 'POST',
    body: { rating, body },
    token: session && session.token
  });
}

export async function adminListReviews() {
  return apiFetch('/admin/reviews', { token: getAdminToken() });
}

export async function adminModerateReview(id, approved) {
  return apiFetch(`/admin/reviews/${encodeURIComponent(id)}`, { method: 'PUT', body: { approved }, token: getAdminToken() });
}

export async function adminDeleteReview(id) {
  return apiFetch(`/admin/reviews/${encodeURIComponent(id)}`, { method: 'DELETE', token: getAdminToken() });
}

// ---------- PACCHETTI REGALO (BUNDLE) ----------

export async function getBundles() {
  return apiFetch('/bundles');
}

export async function adminListBundles() {
  return apiFetch('/admin/bundles', { token: getAdminToken() });
}

export async function adminCreateBundle(bundle) {
  return apiFetch('/admin/bundles', { method: 'POST', body: bundle, token: getAdminToken() });
}

export async function adminUpdateBundle(id, patch) {
  return apiFetch(`/admin/bundles/${encodeURIComponent(id)}`, { method: 'PUT', body: patch, token: getAdminToken() });
}

export async function adminDeleteBundle(id) {
  return apiFetch(`/admin/bundles/${encodeURIComponent(id)}`, { method: 'DELETE', token: getAdminToken() });
}

export async function uploadBundleImage(file) {
  const form = new FormData();
  form.append('image', file);
  const result = await apiFetch('/upload/layout-image', { method: 'POST', body: form, token: getAdminToken(), isForm: true });
  return result.imageUrl;
}

// ---------- NEWSLETTER ----------

export async function subscribeNewsletter(email, locale) {
  return apiFetch('/newsletter/subscribe', { method: 'POST', body: { email, locale } });
}

export async function adminGetNewsletter() {
  return apiFetch('/admin/newsletter', { token: getAdminToken() });
}

// ---------- BLOG ----------

export async function getPosts() {
  return apiFetch('/posts');
}

export async function getPostBySlug(slug) {
  try {
    return await apiFetch(`/posts/${encodeURIComponent(slug)}`);
  } catch (e) {
    return null;
  }
}

export async function adminListPosts() {
  return apiFetch('/admin/posts', { token: getAdminToken() });
}

export async function adminCreatePost(post) {
  return apiFetch('/admin/posts', { method: 'POST', body: post, token: getAdminToken() });
}

export async function adminUpdatePost(id, patch) {
  return apiFetch(`/admin/posts/${encodeURIComponent(id)}`, { method: 'PUT', body: patch, token: getAdminToken() });
}

export async function adminDeletePost(id) {
  return apiFetch(`/admin/posts/${encodeURIComponent(id)}`, { method: 'DELETE', token: getAdminToken() });
}

export async function uploadPostImage(file) {
  const form = new FormData();
  form.append('image', file);
  const result = await apiFetch('/upload/post-image', { method: 'POST', body: form, token: getAdminToken(), isForm: true });
  return result.imageUrl;
}

// ---------- CUSTOMER ACCOUNTS ----------

async function refreshFavoritesCache(email, token) {
  try {
    const ids = await apiFetch('/favorites', { token });
    writeJSON(LS_FAVORITES_PREFIX + email, ids);
  } catch (e) { /* offline o token scaduto: il resto dell'app userà la cache esistente */ }
}

export async function registerUser({ name, email, password }) {
  const result = await apiFetch('/auth/register', { method: 'POST', body: { name, email, password } });
  if (result.requiresEmailConfirmation) {
    throw new Error('EMAIL_CONFIRMATION_REQUIRED');
  }
  const user = { name: result.name, email: result.email };
  setSession({ name: user.name, email: user.email, token: result.token });
  await refreshFavoritesCache(user.email, result.token);
  return user;
}

export async function loginUser({ email, password }) {
  const result = await apiFetch('/auth/login', { method: 'POST', body: { email, password } });
  const user = { name: result.name, email: result.email };
  setSession({ name: user.name, email: user.email, token: result.token });
  await refreshFavoritesCache(user.email, result.token);
  return user;
}

// ---------- RECUPERO PASSWORD ----------

export async function requestPasswordReset(email) {
  return apiFetch('/auth/forgot-password', { method: 'POST', body: { email } });
}

// token: il valore access_token che Supabase mette nell'URL della pagina
// ResetPassword.dc.html dopo che il cliente ha cliccato il link ricevuto via
// email. Non è la password: è un JWT temporaneo che identifica l'utente.
export async function confirmPasswordReset(token, password) {
  return apiFetch('/auth/reset-password', { method: 'POST', body: { password }, token });
}

export function logoutUser() {
  const session = getSession();
  if (session && session.token) {
    apiFetch('/auth/logout', { method: 'POST', token: session.token }).catch(() => {});
  }
  localStorage.removeItem(LS_SESSION);
}

export function getCurrentUser() {
  const session = getSession();
  if (!session) return null;
  return { name: session.name, email: session.email };
}

// ---------- FAVORITES (per utente loggato) ----------
// Lette in modo sincrono da una cache locale (come nella versione precedente
// a localStorage) per non dover riscrivere le schermate che le usano così;
// la cache viene aggiornata dal server a ogni login e dopo ogni toggle.

export function getFavorites(email) {
  if (!email) return [];
  const session = getSession();
  if (session && session.email === email && session.token) {
    refreshFavoritesCache(email, session.token); // fire-and-forget, aggiorna per la prossima lettura
  }
  return readJSON(LS_FAVORITES_PREFIX + email, []);
}

export function isFavorite(email, productId) {
  return getFavorites(email).includes(productId);
}

export function toggleFavorite(email, productId) {
  if (!email) return [];
  const session = getSession();
  const favs = readJSON(LS_FAVORITES_PREFIX + email, []);
  const idx = favs.indexOf(productId);
  if (idx >= 0) favs.splice(idx, 1);
  else favs.push(productId);
  writeJSON(LS_FAVORITES_PREFIX + email, favs);

  if (session && session.token) {
    apiFetch('/favorites/toggle', { method: 'POST', body: { productId }, token: session.token })
      .then((serverIds) => writeJSON(LS_FAVORITES_PREFIX + email, serverIds))
      .catch(() => { /* la cache locale resta comunque coerente con l'ultima azione dell'utente */ });
  }
  return favs;
}

// ---------- CONTACT FORM ----------

export async function sendContactMessage({ name, email, message }) {
  return apiFetch('/contact', { method: 'POST', body: { name, email, message } });
}

// ---------- ADMIN AUTH ----------
// adminLogin è ora ASINCRONA (verifica reale su Supabase): l'unico punto del
// front end che deve gestirla con .then()/await è Admin.dc.html (onLoginSubmit).

export async function adminLogin(username, password) {
  try {
    const result = await apiFetch('/auth/admin-login', { method: 'POST', body: { email: username, password } });
    try { sessionStorage.setItem(LS_ADMIN_SESSION, result.token); } catch (e) {}
    return true;
  } catch (e) {
    return false;
  }
}

export function isAdminLoggedIn() {
  return Boolean(getAdminToken());
}

export function adminLogout() {
  try { sessionStorage.removeItem(LS_ADMIN_SESSION); } catch (e) {}
}

// ---------- ADMIN — UTENTI E PANORAMICA ----------
// Usate dalla sezione "Utenti" e "Panoramica" del pannello Admin.

export async function listUsers() {
  return apiFetch('/admin/users', { token: getAdminToken() });
}

export async function setUserAdmin(id, isAdmin) {
  return apiFetch(`/admin/users/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: { isAdmin },
    token: getAdminToken()
  });
}

export async function getAdminStats() {
  return apiFetch('/admin/stats', { token: getAdminToken() });
}
