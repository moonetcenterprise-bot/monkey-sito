jest.mock('../src/config/supabaseClient');

const request = require('supertest');
const createApp = require('../src/app');
const { authClient, dbClient } = require('../src/config/supabaseClient');

beforeEach(() => {
  jest.clearAllMocks();
  dbClient.resetAll();
});

describe('GET /api/site-texts', () => {
  it('200, pubblico, ritorna i default se non c\'è ancora nulla salvato', async () => {
    dbClient.table('site_texts').__queueResult({ data: null, error: null });
    const app = createApp();
    const res = await request(app).get('/api/site-texts');
    expect(res.status).toBe(200);
    expect(res.body.hero).toBeDefined();
    expect(res.body.about).toBeDefined();
  });
});

describe('PUT /api/site-texts', () => {
  it('401 senza token', async () => {
    const app = createApp();
    const res = await request(app).put('/api/site-texts').send({ hero: {} });
    expect(res.status).toBe(401);
  });

  it('200 con admin', async () => {
    authClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'a1', email: 'admin@example.com' } },
      error: null
    });
    dbClient.table('profiles').__queueResult({ data: { is_admin: true }, error: null });
    // save(): prima legge il valore corrente (get -> select), poi fa upsert
    dbClient.table('site_texts').__queueResult({ data: null, error: null }); // get() interno a save()
    dbClient.table('site_texts').__queueResult({ error: null }); // upsert

    const app = createApp();
    const res = await request(app)
      .put('/api/site-texts')
      .set('Authorization', 'Bearer admin-token')
      .send({ hero: { kicker: { it: 'Nuovo', en: 'New' } } });

    expect(res.status).toBe(200);
    expect(res.body.hero.kicker.it).toBe('Nuovo');
  });
});
