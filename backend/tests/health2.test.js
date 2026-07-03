jest.mock('../src/config/supabaseClient');

const request = require('supertest');
const createApp = require('../src/app');

describe('GET /api/health', () => {
  it('risponde 200 con ok:true', async () => {
    const app = createApp();
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});

describe('rotta sconosciuta', () => {
  it('risponde 404', async () => {
    const app = createApp();
    const res = await request(app).get('/api/non-esiste');
    expect(res.status).toBe(404);
  });
});
