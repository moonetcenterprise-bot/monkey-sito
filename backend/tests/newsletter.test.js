jest.mock('../src/config/supabaseClient');

const request = require('supertest');
const createApp = require('../src/app');
const { authClient, dbClient } = require('../src/config/supabaseClient');

beforeEach(() => {
  jest.clearAllMocks();
  dbClient.resetAll();
});

describe('POST /api/newsletter/subscribe', () => {
  it('400 con email non valida', async () => {
    const app = createApp();
    const res = await request(app).post('/api/newsletter/subscribe').send({ email: 'non-un-email' });
    expect(res.status).toBe(400);
  });

  it('201 con email valida', async () => {
    dbClient.table('newsletter_subscribers').__queueResult({
      data: { id: 1, email: 'cliente@example.com', locale: 'it', created_at: '2026-01-01T00:00:00.000Z' },
      error: null
    });

    const app = createApp();
    const res = await request(app).post('/api/newsletter/subscribe').send({ email: 'cliente@example.com', locale: 'it' });
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ ok: true });
  });
});

describe('GET /api/admin/newsletter', () => {
  it('401 senza token', async () => {
    const app = createApp();
    const res = await request(app).get('/api/admin/newsletter');
    expect(res.status).toBe(401);
  });

  it('200 con admin, ritorna conteggio ed elenco', async () => {
    authClient.auth.getUser.mockResolvedValue({ data: { user: { id: 'a1', email: 'admin@example.com' } }, error: null });
    dbClient.table('profiles').__queueResult({ data: { is_admin: true }, error: null });
    dbClient.table('newsletter_subscribers').__queueResult({
      data: [{ id: 1, email: 'cliente@example.com', locale: 'it', created_at: '2026-01-01T00:00:00.000Z' }],
      error: null
    });

    const app = createApp();
    const res = await request(app).get('/api/admin/newsletter').set('Authorization', 'Bearer admin-token');
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.subscribers).toHaveLength(1);
  });
});
