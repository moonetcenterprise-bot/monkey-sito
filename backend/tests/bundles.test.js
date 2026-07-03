jest.mock('../src/config/supabaseClient');

const request = require('supertest');
const createApp = require('../src/app');
const { authClient, dbClient } = require('../src/config/supabaseClient');

const sampleBundleRow = {
  id: 1,
  slug: 'pacchetto-natale',
  title_it: 'Pacchetto Natale',
  title_en: 'Christmas bundle',
  product_ids: [1, 2],
  discount_pct: 15,
  image_url: null,
  active: true,
  sort_order: 0
};

beforeEach(() => {
  jest.clearAllMocks();
  dbClient.resetAll();
});

describe('GET /api/bundles', () => {
  it('ritorna solo i pacchetti attivi', async () => {
    dbClient.table('bundles').__queueResult({ data: [sampleBundleRow], error: null });
    const app = createApp();
    const res = await request(app).get('/api/bundles');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ slug: 'pacchetto-natale', discountPct: 15, productIds: [1, 2] });
  });
});

describe('GET /api/admin/bundles', () => {
  it('401 senza token', async () => {
    const app = createApp();
    const res = await request(app).get('/api/admin/bundles');
    expect(res.status).toBe(401);
  });

  it('200 con admin, ritorna tutti i pacchetti', async () => {
    authClient.auth.getUser.mockResolvedValue({ data: { user: { id: 'a1', email: 'admin@example.com' } }, error: null });
    dbClient.table('profiles').__queueResult({ data: { is_admin: true }, error: null });
    dbClient.table('bundles').__queueResult({ data: [sampleBundleRow], error: null });

    const app = createApp();
    const res = await request(app).get('/api/admin/bundles').set('Authorization', 'Bearer admin-token');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});

describe('POST /api/admin/bundles', () => {
  it('400 se manca almeno un prodotto', async () => {
    authClient.auth.getUser.mockResolvedValue({ data: { user: { id: 'a1', email: 'admin@example.com' } }, error: null });
    dbClient.table('profiles').__queueResult({ data: { is_admin: true }, error: null });

    const app = createApp();
    const res = await request(app)
      .post('/api/admin/bundles')
      .set('Authorization', 'Bearer admin-token')
      .send({ slug: 'test', title: { it: 'T', en: 'T' }, productIds: [] });
    expect(res.status).toBe(400);
  });

  it('201 con dati validi', async () => {
    authClient.auth.getUser.mockResolvedValue({ data: { user: { id: 'a1', email: 'admin@example.com' } }, error: null });
    dbClient.table('profiles').__queueResult({ data: { is_admin: true }, error: null });
    dbClient.table('bundles').__queueResult({ data: sampleBundleRow, error: null });

    const app = createApp();
    const res = await request(app)
      .post('/api/admin/bundles')
      .set('Authorization', 'Bearer admin-token')
      .send({ slug: 'pacchetto-natale', title: { it: 'Pacchetto Natale', en: 'Christmas bundle' }, productIds: [1, 2], discountPct: 15 });
    expect(res.status).toBe(201);
    expect(res.body.productIds).toEqual([1, 2]);
  });
});

describe('DELETE /api/admin/bundles/:id', () => {
  it('204 con admin', async () => {
    authClient.auth.getUser.mockResolvedValue({ data: { user: { id: 'a1', email: 'admin@example.com' } }, error: null });
    dbClient.table('profiles').__queueResult({ data: { is_admin: true }, error: null });
    dbClient.table('bundles').__queueResult({ error: null });

    const app = createApp();
    const res = await request(app).delete('/api/admin/bundles/1').set('Authorization', 'Bearer admin-token');
    expect(res.status).toBe(204);
  });
});
