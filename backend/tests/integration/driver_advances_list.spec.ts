import request from 'supertest';
import { buildApp } from '../helpers/app';
import { createCompany, createDriver } from '../helpers/factories';
import { createUser, loginAndGetToken } from '../helpers/auth';
import { ErrorResponseSchema } from '../contracts/schemas';
import { prisma } from '../../src/repositories/prisma/client';

describe('[F04][SF03] driver advances list', () => {
  it('driver can list own advances with reject reason', async () => {
    const company = await createCompany('Company A');
    const driver = await createDriver(company.id, 'driver@a.test');
    const driverUser = await createUser({
      email: 'driver@a.test',
      role: 'driver',
      driverId: driver.id,
      companyId: company.id
    });
    const companyUser = await createUser({
      email: 'company@a.test',
      role: 'company',
      companyId: company.id
    });

    const requestedAdvance = await prisma.advances.create({
      data: {
        driver_id: driver.id,
        company_id: company.id,
        requested_amount: 12000n,
        requested_at: new Date(),
        status: 'requested'
      }
    });

    const rejectedAdvance = await prisma.advances.create({
      data: {
        driver_id: driver.id,
        company_id: company.id,
        requested_amount: 8000n,
        requested_at: new Date(),
        status: 'requested'
      }
    });

    const companyToken = await loginAndGetToken(companyUser.email, 'secret');
    const app = buildApp();
    const rejectRes = await request(app)
      .post(`/advances/${rejectedAdvance.id}/reject`)
      .set('Authorization', `Bearer ${companyToken}`)
      .send({ reason: '稼働確認が取れませんでした' });
    expect(rejectRes.status).toBe(200);

    const driverToken = await loginAndGetToken(driverUser.email, 'secret');
    const res = await request(app)
      .get(`/drivers/${driver.id}/advances`)
      .set('Authorization', `Bearer ${driverToken}`);

    expect(res.status).toBe(200);
    const byId = new Map(
      (res.body as Array<{ id: string; rejectReason?: string | null }>).map((row) => [
        row.id,
        row
      ])
    );
    expect(byId.get(rejectedAdvance.id)?.rejectReason).toBe('稼働確認が取れませんでした');
    expect(byId.get(requestedAdvance.id)?.rejectReason ?? null).toBeNull();
  });

  it('driver cannot access another driver advances', async () => {
    const company = await createCompany('Company B');
    const driverA = await createDriver(company.id, 'driver-a@b.test');
    const driverB = await createDriver(company.id, 'driver-b@b.test');
    const driverUserA = await createUser({
      email: 'driver-a@b.test',
      role: 'driver',
      driverId: driverA.id,
      companyId: company.id
    });

    const token = await loginAndGetToken(driverUserA.email, 'secret');
    const app = buildApp();
    const res = await request(app)
      .get(`/drivers/${driverB.id}/advances`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(ErrorResponseSchema.safeParse(res.body).success).toBe(true);
  });
});
