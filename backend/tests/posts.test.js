jest.mock('../src/config/supabaseClient');

const request = require('supertest');
const createApp = require('../src/app');
const { authClient, dbClient } = require('../src/config/supabaseClient');

const samplePostRow = {
  id: 1,
  slug: 'idee-attivita-colorare',
  title_it: 'Idee attività da colorare',
  title_en: 'Coloring activity ideas',
  excerpt_it: 'Qualche spunto',
  excerpt_en: 'Some ideas',
  body_it: 'Testo completo',
  body_en: 'Full text',
  cover_image: null,
  published: true,
  published_at: '2026-01-01T00:00:00.000Z'
};

beforeEach(() => {
  jest.clearAllMocks();
  dbClient.resetAll();
});

describe('GET /api/posts', () => {
  it('ritorna solo gli articoli pubblicati', async () => {
    dbClient.table('posts').__queueResult({ data: [samplePostRow], error: null });
    const app = createApp();
    const res = await request(app).get('/api/posts');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].slug).toBe('idee-attivita-colorare');
  });
});

describe('GET /api/posts/:slug', () => {
  it('404 se non pubblicato o inesistente', async () => {
    dbClient.table('posts').__queueResult({ data: null, error: null });
    const app = createApp();
    const res = await request(app).get('/api/posts/non-esiste');
    expect(res.status).toBe(404);
  });

  it('200 con articolo pubblicato', async () => {
    dbClient.table('posts').__queueResult({ data: samplePostRow, error: null });
    const app = createApp();
    const res = await request(app).get('/api/posts/idee-attivita-colorare');
    expect(res.status).toBe(200);
    expect(res.body.title).toEqual({ it: 'Idee attività da colorare', en: 'Coloring activity ideas' });
  });
});

describe('GET /api/admin/posts', () => {
  it('401 senza token', async () => {
    const app = createApp();
    const res = await request(app).get('/api/admin/posts');
    expect(res.status).toBe(401);
  });

  it('200 con admin, ritorna tutti (pubblicati e bozze)', async () => {
    authClient.auth.getUser.mockResolvedValue({ data: { user: { id: 'a1', email: 'admin@example.com' } }, error: null });
    dbClient.table('profiles').__queueResult({ data: { is_admin: true }, error: null });
    dbClient.table('posts').__queueResult({ data: [samplePostRow], error: null });

    const app = createApp();
    const res = await request(app).get('/api/admin/posts').set('Authorization', 'Bearer admin-token');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});

describe('POST /api/admin/posts', () => {
  it('400 con dati incompleti', async () => {
    authClient.auth.getUser.mockResolvedValue({ data: { user: { id: 'a1', email: 'admin@example.com' } }, error: null });
    dbClient.table('profiles').__queueResult({ data: { is_admin: true }, error: null });

    const app = createApp();
    const res = await request(app)
      .post('/api/admin/posts')
      .set('Authorization', 'Bearer admin-token')
      .send({ slug: 'test' });
    expect(res.status).toBe(400);
  });

  it('201 con dati validi', async () => {
    authClient.auth.getUser.mockResolvedValue({ data: { user: { id: 'a1', email: 'admin@example.com' } }, error: null });
    dbClient.table('profiles').__queueResult({ data: { is_admin: true }, error: null });
    dbClient.table('posts').__queueResult({ data: samplePostRow, error: null });

    const app = createApp();
    const res = await request(app)
      .post('/api/admin/posts')
      .set('Authorization', 'Bearer admin-token')
      .send({
        slug: 'idee-attivita-colorare',
        title: { it: 'Idee attività da colorare', en: 'Coloring activity ideas' },
        body: { it: 'Testo completo', en: 'Full text' }
      });
    expect(res.status).toBe(201);
  });
});

describe('DELETE /api/admin/posts/:id', () => {
  it('204 con admin', async () => {
    authClient.auth.getUser.mockResolvedValue({ data: { user: { id: 'a1', email: 'admin@example.com' } }, error: null });
    dbClient.table('profiles').__queueResult({ data: { is_admin: true }, error: null });
    dbClient.table('posts').__queueResult({ error: null });

    const app = createApp();
    const res = await request(app).delete('/api/admin/posts/1').set('Authorization', 'Bearer admin-token');
    expect(res.status).toBe(204);
  });
});
