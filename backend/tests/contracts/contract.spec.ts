import request from 'supertest';
import { buildApp } from '../helpers/app';
import { AdvanceSchema, ErrorResponseSchema, LoginResponseSchema } from './schemas';
import { createCompany, createDriver } from '../helpers/factories';
import { createUser, loginAndGetToken } from '../helpers/auth';
import { prisma } from '../../src/repositories/prisma/client';
import { monthStart } from '../../src/domain/dates';

describe('[F01][SF01] contract login schema', () => {
  it('login response matches schema', async () => {
    const user = await createUser({ email: 'admin@example.com', role: 'admin' });
    const app = buildApp();
    const res = await request(app).post('/auth/login').send({ email: user.email, password: 'secret' });
    expect(res.status).toBe(200);
    expect(LoginResponseSchema.safeParse(res.body).success).toBe(true);
  });

  it('unauthorized response matches schema', async () => {
    const app = buildApp();
    const res = await request(app).get('/users');
    expect(res.status).toBe(401);
    expect(ErrorResponseSchema.safeParse(res.body).success).toBe(true);
  });

  it('forbidden response matches schema', async () => {
    const company = await createCompany('Company A');
    const user = await createUser({ email: 'company@example.com', role: 'company', companyId: company.id });
    const token = await loginAndGetToken(user.email, 'secret');

    const app = buildApp();
    const res = await request(app)
      .post('/admin/batch/daily')
      .set('Authorization', `Bearer ${token}`)
      .send({ targetDate: new Date().toISOString() });
    expect(res.status).toBe(403);
    expect(ErrorResponseSchema.safeParse(res.body).success).toBe(true);
  });

  it('not found response matches schema', async () => {
    const app = buildApp();
    const res = await request(app).get('/missing');
    expect(res.status).toBe(404);
    expect(ErrorResponseSchema.safeParse(res.body).success).toBe(true);
  });

});

describe('[F03][SF01] contract advance schema', () => {
  it('advance response returns bigint fields as string', async () => {
    const company = await createCompany('Company A');
    const driver = await createDriver(company.id, 'driver@a.test');
    await prisma.earnings.create({
      data: {
        driver_id: driver.id,
        company_id: company.id,
        work_month: monthStart(new Date()),
        payout_month: monthStart(new Date()),
        amount: 50000n,
        status: 'confirmed'
      }
    });
    const user = await createUser({ email: 'driver@a.test', role: 'driver', driverId: driver.id, companyId: company.id });
    const token = await loginAndGetToken(user.email, 'secret');

    const app = buildApp();
    const res = await request(app)
      .post(`/drivers/${driver.id}/advances`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: '10000' });

    expect(res.status).toBe(201);
    expect(AdvanceSchema.safeParse(res.body).success).toBe(true);
  });
});
