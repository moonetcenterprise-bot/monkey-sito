jest.mock('../src/config/supabaseClient');
// L'elaborazione reale con sharp richiede byte immagine validi; nei test ci
// interessa solo verificare il flusso di upload, non la libreria di image
// processing in sé, quindi la sostituiamo con un passthrough deterministico.
jest.mock('../src/utils/imageProcessor', () => ({
  processImage: jest.fn(async (buffer, mimetype) => ({
    buffer,
    ext: mimetype === 'image/png' ? 'png' : 'jpg',
    contentType: mimetype === 'image/png' ? 'image/png' : 'image/jpeg'
  }))
}));

const request = require('supertest');
const createApp = require('../src/app');
const { authClient, dbClient } = require('../src/config/supabaseClient');

beforeEach(() => {
  jest.clearAllMocks();
  dbClient.resetAll();
});

describe('POST /api/upload/product-image', () => {
  it('401 senza token', async () => {
    const app = createApp();
    const res = await request(app).post('/api/upload/product-image');
    expect(res.status).toBe(401);
  });

  it('201 con admin e un file immagine, ritorna imageUrl', async () => {
    authClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'a1', email: 'admin@example.com' } },
      error: null
    });
    dbClient.table('profiles').__queueResult({ data: { is_admin: true }, error: null });

    const app = createApp();
    const res = await request(app)
      .post('/api/upload/product-image')
      .set('Authorization', 'Bearer admin-token')
      .attach('image', Buffer.from('finto-contenuto-immagine'), { filename: 'test.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(201);
    expect(res.body.imageUrl).toContain('product-images');
  });
});

describe('POST /api/upload/layout-image', () => {
  it('401 senza token', async () => {
    const app = createApp();
    const res = await request(app).post('/api/upload/layout-image');
    expect(res.status).toBe(401);
  });

  it('201 con admin e un file immagine, ritorna imageUrl', async () => {
    authClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'a1', email: 'admin@example.com' } },
      error: null
    });
    dbClient.table('profiles').__queueResult({ data: { is_admin: true }, error: null });

    const app = createApp();
    const res = await request(app)
      .post('/api/upload/layout-image')
      .set('Authorization', 'Bearer admin-token')
      .attach('image', Buffer.from('finto-contenuto-immagine'), { filename: 'about.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(201);
    expect(res.body.imageUrl).toContain('product-images');
  });
});

describe('POST /api/upload/post-image', () => {
  it('401 senza token', async () => {
    const app = createApp();
    const res = await request(app).post('/api/upload/post-image');
    expect(res.status).toBe(401);
  });

  it('201 con admin e un file immagine, ritorna imageUrl', async () => {
    authClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'a1', email: 'admin@example.com' } },
      error: null
    });
    dbClient.table('profiles').__queueResult({ data: { is_admin: true }, error: null });

    const app = createApp();
    const res = await request(app)
      .post('/api/upload/post-image')
      .set('Authorization', 'Bearer admin-token')
      .attach('image', Buffer.from('finto-contenuto-immagine'), { filename: 'cover.jpg', contentType: 'image/jpeg' });

    expect(res.status).toBe(201);
    expect(res.body.imageUrl).toContain('product-images');
  });
});
