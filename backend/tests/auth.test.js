jest.mock('../src/config/supabaseClient');

const request = require('supertest');
const createApp = require('../src/app');
const { authClient, dbClient } = require('../src/config/supabaseClient');

beforeEach(() => {
  jest.clearAllMocks();
  dbClient.resetAll();
});

describe('POST /api/auth/register', () => {
  it('400 con email non valida', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Mario', email: 'non-valida', password: '123456' });
    expect(res.status).toBe(400);
  });

  it('409 se l\'email è già registrata', async () => {
    authClient.auth.signUp.mockResolvedValue({
      data: null,
      error: { message: 'User already registered' }
    });
    const app = createApp();
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Mario', email: 'mario@example.com', password: '123456' });
    expect(res.status).toBe(409);
  });

  it('201 e restituisce un token in caso di successo', async () => {
    authClient.auth.signUp.mockResolvedValue({
      data: {
        user: { id: 'u1', email: 'mario@example.com', user_metadata: { name: 'Mario' } },
        session: { access_token: 'tok-123' }
      },
      error: null
    });
    dbClient.table('profiles').__queueResult({ error: null }); // upsert profilo (safety net)

    const app = createApp();
    const res = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Mario', email: 'mario@example.com', password: '123456' });

    expect(res.status).toBe(201);
    expect(res.body.token).toBe('tok-123');
    expect(res.body.email).toBe('mario@example.com');
  });
});

describe('POST /api/auth/login', () => {
  it('401 con credenziali errate', async () => {
    authClient.auth.signInWithPassword.mockResolvedValue({
      data: { session: null, user: null },
      error: { message: 'Invalid login credentials' }
    });
    const app = createApp();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'mario@example.com', password: 'sbagliata' });
    expect(res.status).toBe(401);
  });

  it('200 con credenziali corrette', async () => {
    authClient.auth.signInWithPassword.mockResolvedValue({
      data: {
        session: { access_token: 'tok-456' },
        user: { id: 'u1', email: 'mario@example.com', user_metadata: { name: 'Mario' } }
      },
      error: null
    });
    dbClient.table('profiles').__queueResult({ data: { name: 'Mario', is_admin: false }, error: null });

    const app = createApp();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'mario@example.com', password: '123456' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBe('tok-456');
  });
});

describe('GET /api/auth/me', () => {
  it('401 senza token', async () => {
    const app = createApp();
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('200 con token valido', async () => {
    authClient.auth.getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'mario@example.com' } },
      error: null
    });
    dbClient.table('profiles').__queueResult({ data: { name: 'Mario', is_admin: false }, error: null });

    const app = createApp();
    const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer tok-456');
    expect(res.status).toBe(200);
    expect(res.body.email).toBe('mario@example.com');
  });
});
