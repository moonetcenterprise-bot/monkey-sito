jest.mock('../src/config/supabaseClient');

const request = require('supertest');
const createApp = require('../src/app');
const { authClient, dbClient } = require('../src/config/supabaseClient');

beforeEach(() => {
  jest.clearAllMocks();
  dbClient.resetAll();
});

describe('GET /api/favorites', () => {
  it('401 senza token', async () => {
    const app = createApp();
    const res = await request(app).get('/api/favorites');
    expect(res.status).toBe(401);
  });

  it('200 con token valido, ritorna gli id preferiti', async () => {
    authClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'mario@example.com' } },
      error: null
    });
    dbClient.table('favorites').__queueResult({ data: [{ product_id: 3 }, { product_id: 7 }], error: null });

    const app = createApp();
    const res = await request(app).get('/api/favorites').set('Authorization', 'Bearer tok');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([3, 7]);
  });
});

describe('POST /api/favorites/toggle', () => {
  it('aggiunge il prodotto se non è tra i preferiti', async () => {
    authClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'mario@example.com' } },
      error: null
    });
    // toggle(): prima list() per capire se è già presente...
    dbClient.table('favorites').__queueResult({ data: [], error: null });
    // ...poi upsert...
    dbClient.table('favorites').__queueResult({ error: null });
    // ...poi list() di nuovo per la risposta finale
    dbClient.table('favorites').__queueResult({ data: [{ product_id: 5 }], error: null });

    const app = createApp();
    const res = await request(app)
      .post('/api/favorites/toggle')
      .set('Authorization', 'Bearer tok')
      .send({ productId: 5 });

    expect(res.status).toBe(200);
    expect(res.body).toEqual([5]);
  });
});
