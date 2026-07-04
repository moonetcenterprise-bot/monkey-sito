jest.mock('../src/config/supabaseClient');

const request = require('supertest');
const createApp = require('../src/app');
const { authClient, dbClient } = require('../src/config/supabaseClient');

const sampleRow = {
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
  title_it: 'Amici della Giungla',
  title_en: 'Jungle Friends',
  tagline_it: 'tagline it',
  tagline_en: 'tagline en',
  description_it: 'desc it',
  description_en: 'desc en'
};

function mockAuthUser(token, user) {
  authClient.auth.getUser.mockImplementation(async (t) => {
    if (t === token) return { data: { user }, error: null };
    return { data: null, error: { message: 'invalid token' } };
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  dbClient.resetAll();
});

describe('GET /api/products', () => {
  it('ritorna la lista pubblica dei prodotti, con rating calcolato dalle recensioni approvate', async () => {
    dbClient.table('products').__queueResult({ data: [sampleRow], error: null });
    dbClient.table('reviews').__queueResult({
      data: [
        { product_id: 1, rating: 5 },
        { product_id: 1, rating: 4 },
        { product_id: 1, rating: 5 }
      ],
      error: null
    });
    const app = createApp();
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({
      id: 1,
      slug: 'amici-della-giungla',
      title: { it: 'Amici della Giungla', en: 'Jungle Friends' },
      rating: 4.7,
      reviewsCount: 3
    });
  });

  it('un prodotto senza recensioni approvate non mostra rating/badge bestseller', async () => {
    dbClient.table('products').__queueResult({ data: [sampleRow], error: null });
    dbClient.table('reviews').__queueResult({ data: [], error: null });
    const app = createApp();
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(res.body[0].rating).toBeNull();
    expect(res.body[0].reviewsCount).toBe(0);
    expect(res.body[0].badge).not.toBe('bestseller');
  });
});

describe('GET /api/products/:slug', () => {
  it('404 se il prodotto non esiste', async () => {
    dbClient.table('products').__queueResult({ data: null, error: null });
    const app = createApp();
    const res = await request(app).get('/api/products/non-esiste');
    expect(res.status).toBe(404);
  });

  it('200 se il prodotto esiste', async () => {
    dbClient.table('products').__queueResult({ data: sampleRow, error: null });
    dbClient.table('reviews').__queueResult({ data: [], error: null });
    const app = createApp();
    const res = await request(app).get('/api/products/amici-della-giungla');
    expect(res.status).toBe(200);
    expect(res.body.slug).toBe('amici-della-giungla');
  });
});

describe('POST /api/products (protezione admin)', () => {
  it('401 senza token', async () => {
    const app = createApp();
    const res = await request(app).post('/api/products').send({});
    expect(res.status).toBe(401);
  });

  it('403 con utente autenticato ma non admin', async () => {
    mockAuthUser('user-token', { id: 'u1', email: 'user@example.com' });
    dbClient.table('profiles').__queueResult({ data: { is_admin: false }, error: null });

    const app = createApp();
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', 'Bearer user-token')
      .send({
        slug: 'nuovo-libro',
        category: 'kids',
        price: 9.9,
        title: { it: 'a', en: 'b' },
        tagline: { it: 'a', en: 'b' },
        description: { it: 'a', en: 'b' }
      });
    expect(res.status).toBe(403);
  });

  it('400 se il body non rispetta lo schema', async () => {
    mockAuthUser('admin-token', { id: 'a1', email: 'admin@example.com' });
    dbClient.table('profiles').__queueResult({ data: { is_admin: true }, error: null });

    const app = createApp();
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', 'Bearer admin-token')
      .send({ slug: 'X invalido' }); // categoria/prezzo/titoli mancanti
    expect(res.status).toBe(400);
  });

  it('201 con admin e body valido', async () => {
    mockAuthUser('admin-token', { id: 'a1', email: 'admin@example.com' });
    dbClient.table('profiles').__queueResult({ data: { is_admin: true }, error: null });
    dbClient.table('products').__queueResult({ data: { ...sampleRow, id: 99, slug: 'nuovo-libro' }, error: null });

    const app = createApp();
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', 'Bearer admin-token')
      .send({
        slug: 'nuovo-libro',
        category: 'kids',
        price: 9.9,
        title: { it: 'Titolo', en: 'Title' },
        tagline: { it: 'Tagline', en: 'Tagline' },
        description: { it: 'Descrizione', en: 'Description' }
      });
    expect(res.status).toBe(201);
    expect(res.body.slug).toBe('nuovo-libro');
  });
});

describe('DELETE /api/products/:id', () => {
  it('204 con admin', async () => {
    mockAuthUser('admin-token', { id: 'a1', email: 'admin@example.com' });
    dbClient.table('profiles').__queueResult({ data: { is_admin: true }, error: null });
    dbClient.table('products').__queueResult({ data: null, error: null });

    const app = createApp();
    const res = await request(app)
      .delete('/api/products/1')
      .set('Authorization', 'Bearer admin-token');
    expect(res.status).toBe(204);
  });
});
