import request from 'supertest';
import { buildApp } from '../helpers/app';
import { createCompany, createDriver } from '../helpers/factories';
import { createUser, loginAndGetToken } from '../helpers/auth';
import { prisma } from '../../src/repositories/prisma/client';
import { monthStart } from '../../src/domain/dates';

describe('[F05][SF01] scenario advance mark paid', () => {
  it('company approves and marks advance as paid', async () => {
    const company = await createCompany('Company A');
    const driver = await createDriver(company.id, 'driver@a.test');
    const driverUser = await createUser({
      email: driver.email ?? 'driver@a.test',
      role: 'driver',
      driverId: driver.id,
      companyId: company.id
    });
    const companyUser = await createUser({ email: 'company@a.test', role: 'company', companyId: company.id });

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

    const approveRes = await request(app)
      .post(`/advances/${requestRes.body.id}/approve`)
      .set('Authorization', `Bearer ${companyToken}`)
      .send({ approvedAt: new Date().toISOString() });
    expect(approveRes.status).toBe(200);

    const paidRes = await request(app)
      .post(`/advances/${requestRes.body.id}/mark-paid`)
      .set('Authorization', `Bearer ${companyToken}`)
      .send({ payoutDate: new Date().toISOString() });
    expect(paidRes.status).toBe(200);
  });
});
