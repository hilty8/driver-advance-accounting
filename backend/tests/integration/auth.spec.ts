import request from 'supertest';
import { prisma } from '../../src/repositories/prisma/client';
import { hashPassword } from '../../src/domain/passwords';
import { buildApp } from '../helpers/app';

describe('[F01][SF01] auth', () => {
  it('issues token for valid credentials', async () => {
    const user = await prisma.users.create({
      data: {
        email: 'admin@example.com',
        password_hash: hashPassword('secret'),
        role: 'admin',
        is_active: true
      }
    });

    const app = buildApp();
    const res = await request(app)
      .post('/auth/login')
      .send({ email: user.email, password: 'secret' });

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({ id: user.id, email: user.email, role: 'admin' });
  });

  it('rejects access without token', async () => {
    const app = buildApp();
    const res = await request(app).get('/users');
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'unauthorized' });
  });

  it('rejects access with insufficient role', async () => {
    const user = await prisma.users.create({
      data: {
        email: 'company@example.com',
        password_hash: hashPassword('secret'),
        role: 'company',
        is_active: true
      }
    });

    const app = buildApp();
    const login = await request(app)
      .post('/auth/login')
      .send({ email: user.email, password: 'secret' });

    const token = login.body.token;
    const res = await request(app)
      .post('/admin/batch/daily')
      .set('Authorization', `Bearer ${token}`)
      .send({ targetDate: new Date().toISOString() });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ error: 'forbidden' });
  });
});
