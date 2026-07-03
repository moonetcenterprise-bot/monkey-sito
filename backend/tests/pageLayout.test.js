jest.mock('../src/config/supabaseClient');

const request = require('supertest');
const createApp = require('../src/app');
const { authClient, dbClient } = require('../src/config/supabaseClient');

beforeEach(() => {
  jest.clearAllMocks();
  dbClient.resetAll();
});

describe('GET /api/page-layout/:page', () => {
  it('200, pubblico, ritorna i blocchi di default se non c\'è ancora nulla salvato', async () => {
    dbClient.table('page_layout').__queueResult({ data: null, error: null });
    const app = createApp();
    const res = await request(app).get('/api/page-layout/home');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.blocks)).toBe(true);
    expect(res.body.blocks.length).toBeGreaterThan(0);
    expect(res.body.blocks.find((b) => b.id === 'hero')).toBeDefined();
  });

  it('404 per una pagina sconosciuta', async () => {
    const app = createApp();
    const res = await request(app).get('/api/page-layout/nonesiste');
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/page-layout/:page', () => {
  it('401 senza token', async () => {
    const app = createApp();
    const res = await request(app).put('/api/page-layout/home').send({ blocks: [] });
    expect(res.status).toBe(401);
  });

  it('400 se il body non ha un array blocks', async () => {
    authClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'a1', email: 'admin@example.com' } },
      error: null
    });
    dbClient.table('profiles').__queueResult({ data: { is_admin: true }, error: null });

    const app = createApp();
    const res = await request(app)
      .put('/api/page-layout/home')
      .set('Authorization', 'Bearer admin-token')
      .send({ blocks: 'non-un-array' });

    expect(res.status).toBe(400);
  });

  it('200 con admin, salva e ritorna il layout aggiornato', async () => {
    authClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'a1', email: 'admin@example.com' } },
      error: null
    });
    dbClient.table('profiles').__queueResult({ data: { is_admin: true }, error: null });

    const savedBlocks = [{ id: 'hero', type: 'hero', order: 0, style: { bg: '#000000' }, content: {} }];
    dbClient.table('page_layout').__queueResult({ error: null }); // upsert
    dbClient.table('page_layout').__queueResult({ data: { content: { blocks: savedBlocks } }, error: null }); // get() interno

    const app = createApp();
    const res = await request(app)
      .put('/api/page-layout/home')
      .set('Authorization', 'Bearer admin-token')
      .send({ blocks: savedBlocks });

    expect(res.status).toBe(200);
    expect(res.body.blocks[0].style.bg).toBe('#000000');
  });

  it('404 per una pagina sconosciuta anche da admin', async () => {
    authClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'a1', email: 'admin@example.com' } },
      error: null
    });
    dbClient.table('profiles').__queueResult({ data: { is_admin: true }, error: null });

    const app = createApp();
    const res = await request(app)
      .put('/api/page-layout/nonesiste')
      .set('Authorization', 'Bearer admin-token')
      .send({ blocks: [] });

    expect(res.status).toBe(404);
  });
});
