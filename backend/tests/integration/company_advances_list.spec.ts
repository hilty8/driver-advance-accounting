import request from 'supertest';
import { buildApp } from '../helpers/app';
import { createCompany, createDriver } from '../helpers/factories';
import { createUser, loginAndGetToken } from '../helpers/auth';
import { ErrorResponseSchema } from '../contracts/schemas';
import { prisma } from '../../src/repositories/prisma/client';
import { monthStart } from '../../src/domain/dates';

describe('[F03][SF02] company advances list', () => {
  it('company can list advances in descending order', async () => {
    const company = await createCompany('Company A');
    const driverName = 'Driver A';
    const driver = await createDriver(company.id, 'driver@a.test', driverName);
    const companyUser = await createUser({ email: 'company@example.com', role: 'company', companyId: company.id });
    const driverUser = await createUser({ email: 'driver@a.test', role: 'driver', driverId: driver.id, companyId: company.id });

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

    const driverToken = await loginAndGetToken(driverUser.email, 'secret');
    const companyToken = await loginAndGetToken(companyUser.email, 'secret');

    const app = buildApp();
    const requestRes = await request(app)
      .post(`/drivers/${driver.id}/advances`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ amount: '10000' });
    expect(requestRes.status).toBe(201);

    const listRes = await request(app)
      .get(`/companies/${company.id}/advances`)
      .set('Authorization', `Bearer ${companyToken}`);
    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body)).toBe(true);
    expect(listRes.body[0].id).toBe(requestRes.body.id);
    expect(listRes.body[0].driverName).toBe(driverName);
  });

  it('company cannot access another company advances', async () => {
    const company = await createCompany('Company A');
    const otherCompany = await createCompany('Company B');
    const user = await createUser({ email: 'company@example.com', role: 'company', companyId: company.id });
    const token = await loginAndGetToken(user.email, 'secret');

    const app = buildApp();
    const res = await request(app)
      .get(`/companies/${otherCompany.id}/advances`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(ErrorResponseSchema.safeParse(res.body).success).toBe(true);
  });

  it('non-company role is forbidden', async () => {
    const company = await createCompany('Company A');
    const user = await createUser({ email: 'admin@example.com', role: 'admin' });
    const token = await loginAndGetToken(user.email, 'secret');

    const app = buildApp();
    const res = await request(app)
      .get(`/companies/${company.id}/advances`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(ErrorResponseSchema.safeParse(res.body).success).toBe(true);
  });
});
