import request from 'supertest';
import { buildApp } from '../helpers/app';
import { createCompany, createDriver } from '../helpers/factories';
import { createUser, loginAndGetToken } from '../helpers/auth';
import { ErrorResponseSchema } from '../contracts/schemas';
import { prisma } from '../../src/repositories/prisma/client';

describe('[F04][SF02] advance reject', () => {
  it('company can reject advance', async () => {
    const company = await createCompany('Company A');
    const driver = await createDriver(company.id, 'driver@a.test');
    const companyUser = await createUser({ email: 'company@a.test', role: 'company', companyId: company.id });
    const token = await loginAndGetToken(companyUser.email, 'secret');

    const advance = await prisma.advances.create({
      data: {
        driver_id: driver.id,
        company_id: company.id,
        requested_amount: 10000n,
        requested_at: new Date(),
        status: 'requested'
      }
    });

    const app = buildApp();
    const res = await request(app)
      .post(`/advances/${advance.id}/reject`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'no' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('rejected');
  });

  it('other company cannot reject advance', async () => {
    const companyA = await createCompany('Company A');
    const companyB = await createCompany('Company B');
    const driver = await createDriver(companyA.id, 'driver@a.test');
    const companyUserB = await createUser({ email: 'companyb@b.test', role: 'company', companyId: companyB.id });
    const token = await loginAndGetToken(companyUserB.email, 'secret');

    const advance = await prisma.advances.create({
      data: {
        driver_id: driver.id,
        company_id: companyA.id,
        requested_amount: 10000n,
        requested_at: new Date(),
        status: 'requested'
      }
    });

    const app = buildApp();
    const res = await request(app)
      .post(`/advances/${advance.id}/reject`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: 'no' });

    expect(res.status).toBe(403);
    expect(ErrorResponseSchema.safeParse(res.body).success).toBe(true);
  });
});
