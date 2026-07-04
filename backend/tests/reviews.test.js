jest.mock('../src/config/supabaseClient');

const request = require('supertest');
const createApp = require('../src/app');
const { authClient, dbClient } = require('../src/config/supabaseClient');

const sampleProductRow = {
  id: 1,
  slug: 'amici-della-giungla',
  category: 'kids',
  price: 9.9,
  old_price: null,
  pages: 32,
  age: '4-8',
  rating: 4.8,
  reviews_count: 0,
  badge: null,
  sort_order: 0,
  image_url: null,
  title_it: 'Amici della Giungla',
  title_en: 'Jungle Friends',
  tagline_it: 'tagline it',
  tagline_en: 'tagline en',
  description_it: 'desc it',
  description_en: 'desc en'
};

const sampleReviewRow = {
  id: 5,
  product_id: 1,
  user_id: 'u1',
  author_name: 'Giulia',
  rating: 5,
  body: 'Bellissimo libro!',
  approved: true,
  created_at: '2026-01-01T00:00:00.000Z'
};

beforeEach(() => {
  jest.clearAllMocks();
  dbClient.resetAll();
});

describe('GET /api/products/:slug/reviews', () => {
  it('ritorna solo le recensioni approvate', async () => {
    dbClient.table('products').__queueResult({ data: sampleProductRow, error: null });
    // listForProduct chiama findBySlug (1a query su reviews: fetchReviewStats)
    // e poi findApprovedByProductId (2a query su reviews): la coda FIFO va
    // rispettata nello stesso ordine in cui il codice le esegue.
    dbClient.table('reviews').__queueResult({ data: [sampleReviewRow], error: null }); // fetchReviewStats
    dbClient.table('reviews').__queueResult({ data: [sampleReviewRow], error: null }); // findApprovedByProductId

    const app = createApp();
    const res = await request(app).get('/api/products/amici-della-giungla/reviews');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ authorName: 'Giulia', rating: 5, approved: true });
  });

  it('404 se il prodotto non esiste', async () => {
    dbClient.table('products').__queueResult({ data: null, error: null });
    const app = createApp();
    const res = await request(app).get('/api/products/non-esiste/reviews');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/products/:slug/reviews', () => {
  it('401 senza token', async () => {
    const app = createApp();
    const res = await request(app).post('/api/products/amici-della-giungla/reviews').send({ rating: 5, body: 'Ok' });
    expect(res.status).toBe(401);
  });

  it('400 con dati non validi', async () => {
    authClient.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'cliente@example.com' } }, error: null });
    const app = createApp();
    const res = await request(app)
      .post('/api/products/amici-della-giungla/reviews')
      .set('Authorization', 'Bearer user-token')
      .send({ rating: 9, body: '' });
    expect(res.status).toBe(400);
  });

  it('201 crea la recensione in attesa di approvazione', async () => {
    authClient.auth.getUser.mockResolvedValue({ data: { user: { id: 'u1', email: 'cliente@example.com' } }, error: null });
    dbClient.table('products').__queueResult({ data: sampleProductRow, error: null });
    // createForProduct chiama findBySlug, che a sua volta chiama
    // fetchReviewStats (1a query su reviews) prima ancora di creare la
    // recensione vera e propria (2a query su reviews, l'insert).
    dbClient.table('reviews').__queueResult({ data: [], error: null }); // fetchReviewStats
    dbClient.table('profiles').__queueResult({ data: { name: 'Cliente Test' }, error: null });
    dbClient.table('reviews').__queueResult({ data: Object.assign({}, sampleReviewRow, { approved: false, author_name: 'Cliente Test' }), error: null }); // insert

    const app = createApp();
    const res = await request(app)
      .post('/api/products/amici-della-giungla/reviews')
      .set('Authorization', 'Bearer user-token')
      .send({ rating: 5, body: 'Molto bello' });

    expect(res.status).toBe(201);
    expect(res.body.approved).toBe(false);
    expect(res.body.authorName).toBe('Cliente Test');
  });
});

describe('GET /api/admin/reviews', () => {
  it('401 senza token', async () => {
    const app = createApp();
    const res = await request(app).get('/api/admin/reviews');
    expect(res.status).toBe(401);
  });

  it('200 con admin, ritorna tutte le recensioni', async () => {
    authClient.auth.getUser.mockResolvedValue({ data: { user: { id: 'a1', email: 'admin@example.com' } }, error: null });
    dbClient.table('profiles').__queueResult({ data: { is_admin: true }, error: null });
    dbClient.table('reviews').__queueResult({ data: [sampleReviewRow], error: null });

    const app = createApp();
    const res = await request(app).get('/api/admin/reviews').set('Authorization', 'Bearer admin-token');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});

describe('PUT /api/admin/reviews/:id', () => {
  it('200 con admin, approva la recensione', async () => {
    authClient.auth.getUser.mockResolvedValue({ data: { user: { id: 'a1', email: 'admin@example.com' } }, error: null });
    dbClient.table('profiles').__queueResult({ data: { is_admin: true }, error: null });
    dbClient.table('reviews').__queueResult({ data: sampleReviewRow, error: null });

    const app = createApp();
    const res = await request(app)
      .put('/api/admin/reviews/5')
      .set('Authorization', 'Bearer admin-token')
      .send({ approved: true });
    expect(res.status).toBe(200);
    expect(res.body.approved).toBe(true);
  });
});

describe('DELETE /api/admin/reviews/:id', () => {
  it('204 con admin', async () => {
    authClient.auth.getUser.mockResolvedValue({ data: { user: { id: 'a1', email: 'admin@example.com' } }, error: null });
    dbClient.table('profiles').__queueResult({ data: { is_admin: true }, error: null });
    dbClient.table('reviews').__queueResult({ error: null });

    const app = createApp();
    const res = await request(app).delete('/api/admin/reviews/5').set('Authorization', 'Bearer admin-token');
    expect(res.status).toBe(204);
  });
});
