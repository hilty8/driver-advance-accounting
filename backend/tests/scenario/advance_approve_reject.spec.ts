import request from 'supertest';
import { buildApp } from '../helpers/app';
import { createCompany, createDriver } from '../helpers/factories';
import { createUser, loginAndGetToken } from '../helpers/auth';
import { prisma } from '../../src/repositories/prisma/client';
import { monthStart } from '../../src/domain/dates';

describe('[F04][SF01][SF02] advance approve/reject scenario', () => {
  it('company approves and rejects requested advances', async () => {
    const company = await createCompany('Scenario Company');
    const driver = await createDriver(company.id, 'scenario-driver@test.com');
    const driverUser = await createUser({
      email: 'scenario-driver@test.com',
      role: 'driver',
      driverId: driver.id,
      companyId: company.id
    });
    const companyUser = await createUser({
      email: 'scenario-company@test.com',
      role: 'company',
      companyId: company.id
    });

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

    const requested = await request(app)
      .post(`/drivers/${driver.id}/advances`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ amount: '10000' });
    expect(requested.status).toBe(201);

    const approved = await request(app)
      .post(`/advances/${requested.body.id}/approve`)
      .set('Authorization', `Bearer ${companyToken}`)
      .send({ approvedAt: new Date().toISOString() });
    expect(approved.status).toBe(200);

    const requested2 = await request(app)
      .post(`/drivers/${driver.id}/advances`)
      .set('Authorization', `Bearer ${driverToken}`)
      .send({ amount: '8000' });
    expect(requested2.status).toBe(201);

    const rejected = await request(app)
      .post(`/advances/${requested2.body.id}/reject`)
      .set('Authorization', `Bearer ${companyToken}`)
      .send({ reason: '稼働確認が取れないため' });
    expect(rejected.status).toBe(200);
  });
});
