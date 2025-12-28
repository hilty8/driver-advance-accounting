import request from 'supertest';
import { buildApp } from '../helpers/app';

describe('[F00][SF01] smoke', () => {
  it('returns 404 with json error for unknown route', async () => {
    const app = buildApp();
    const res = await request(app).get('/unknown');
    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'not found' });
  });
});
