jest.mock('../src/config/supabaseClient');

const request = require('supertest');
const createApp = require('../src/app');
const { authClient, dbClient } = require('../src/config/supabaseClient');

function mockAdmin() {
  authClient.auth.getUser.mockResolvedValue({
    data: { user: { id: 'admin-1', email: 'admin@example.com' } },
    error: null
  });
  // requireAdmin: profiles.select('is_admin').eq(id).single()
  dbClient.table('profiles').__queueResult({ data: { is_admin: true }, error: null });
}

const sampleProductRow = {
  id: 1,
  slug: 'amici-della-giungla',
  category: 'kids',
  price: 9.9,
  old_price: null,
  pages: 32,
  age: '4-8',
  rating: 4.8,
  reviews_count: 142,
  badge: null,
  sort_order: 0,
  image_url: null,
  amazon_url: null,
  title_it: 'Amici della Giungla',
  title_en: 'Jungle Friends',
  tagline_it: 't',
  tagline_en: 't',
  description_it: 'd',
  description_en: 'd'
};

beforeEach(() => {
  jest.clearAllMocks();
  dbClient.resetAll();
});

describe('GET /api/admin/users', () => {
  it('401 senza token', async () => {
    const app = createApp();
    const res = await request(app).get('/api/admin/users');
    expect(res.status).toBe(401);
  });

  it('403 se autenticato ma non admin', async () => {
    authClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'user@example.com' } },
      error: null
    });
    dbClient.table('profiles').__queueResult({ data: { is_admin: false }, error: null });

    const app = createApp();
    const res = await request(app).get('/api/admin/users').set('Authorization', 'Bearer user-token');
    expect(res.status).toBe(403);
  });

  it('200 con la lista utenti per un admin', async () => {
    mockAdmin();
    dbClient.table('profiles').__queueResult({
      data: [
        { id: 'u1', name: 'Mario', email: 'mario@example.com', is_admin: false, created_at: '2026-01-01' },
        { id: 'admin-1', name: 'Admin', email: 'admin@example.com', is_admin: true, created_at: '2026-01-02' }
      ],
      error: null
    });

    const app = createApp();
    const res = await request(app).get('/api/admin/users').set('Authorization', 'Bearer admin-token');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0]).toMatchObject({ email: 'mario@example.com', isAdmin: false });
  });
});

describe('PUT /api/admin/users/:id', () => {
  it('400 se isAdmin non è un booleano', async () => {
    mockAdmin();
    const app = createApp();
    const res = await request(app)
      .put('/api/admin/users/u1')
      .set('Authorization', 'Bearer admin-token')
      .send({ isAdmin: 'yes' });
    expect(res.status).toBe(400);
  });

  it('404 se l\'utente non esiste', async () => {
    mockAdmin();
    dbClient.table('profiles').__queueResult({ data: null, error: null });

    const app = createApp();
    const res = await request(app)
      .put('/api/admin/users/non-esiste')
      .set('Authorization', 'Bearer admin-token')
      .send({ isAdmin: true });
    expect(res.status).toBe(404);
  });

  it('200 e promuove l\'utente ad admin', async () => {
    mockAdmin();
    dbClient.table('profiles').__queueResult({
      data: { id: 'u1', name: 'Mario', email: 'mario@example.com', is_admin: true, created_at: '2026-01-01' },
      error: null
    });

    const app = createApp();
    const res = await request(app)
      .put('/api/admin/users/u1')
      .set('Authorization', 'Bearer admin-token')
      .send({ isAdmin: true });
    expect(res.status).toBe(200);
    expect(res.body.isAdmin).toBe(true);
  });
});

describe('GET /api/admin/stats', () => {
  it('401 senza token', async () => {
    const app = createApp();
    const res = await request(app).get('/api/admin/stats');
    expect(res.status).toBe(401);
  });

  it('200 con panoramica aggregata per un admin', async () => {
    mockAdmin();
    // profilesModel.count(): select('*', {count, head:true})
    dbClient.table('profiles').__queueResult({ count: 12, error: null });
    // productsModel.findAll(): select('*').order(...)
    dbClient.table('products').__queueResult({ data: [sampleProductRow], error: null });
    // fetchReviewStats() chiamata da findAll(): select('product_id, rating').eq('approved', true).in(...)
    dbClient.table('reviews').__queueResult({ data: [], error: null });
    // favoritesModel.countsByProduct(): select('product_id')
    dbClient.table('favorites').__queueResult({ data: [{ product_id: 1 }, { product_id: 1 }], error: null });

    const app = createApp();
    const res = await request(app).get('/api/admin/stats').set('Authorization', 'Bearer admin-token');

    expect(res.status).toBe(200);
    expect(res.body.totalUsers).toBe(12);
    expect(res.body.totalProducts).toBe(1);
    expect(res.body.productsByCategory).toEqual({ kids: 1 });
    expect(res.body.topFavorites).toEqual([{ productId: 1, title: 'Amici della Giungla', count: 2 }]);
  });
});
