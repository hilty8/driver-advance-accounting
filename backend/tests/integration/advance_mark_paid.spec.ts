import request from 'supertest';
import { buildApp } from '../helpers/app';
import { createCompany, createDriver } from '../helpers/factories';
import { createUser, loginAndGetToken } from '../helpers/auth';
import { ErrorResponseSchema } from '../contracts/schemas';
import { prisma } from '../../src/repositories/prisma/client';
import { monthStart } from '../../src/domain/dates';

describe('[F05][SF01] advance mark paid', () => {
  it('company marks approved advance as paid and logs audit', async () => {
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
      .set('Authorization', `Bearer ${companyToken}`);
    expect(paidRes.status).toBe(200);
    expect(paidRes.body.status).toBe('paid');

    const logs = await prisma.advance_audit_logs.findMany({
      where: { advance_id: requestRes.body.id, action: 'paid' }
    });
    expect(logs).toHaveLength(1);
    expect(logs[0].actor_user_id).toBe(companyUser.id);
    expect(logs[0].company_id).toBe(company.id);
    expect(logs[0].driver_id).toBe(driver.id);
    expect(logs[0].reason).toBeNull();
  });

  it('returns 409 on double mark-paid and logs only once', async () => {
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

    const firstPaidRes = await request(app)
      .post(`/advances/${requestRes.body.id}/mark-paid`)
      .set('Authorization', `Bearer ${companyToken}`);
    expect(firstPaidRes.status).toBe(200);

    const secondPaidRes = await request(app)
      .post(`/advances/${requestRes.body.id}/mark-paid`)
      .set('Authorization', `Bearer ${companyToken}`);
    expect(secondPaidRes.status).toBe(409);
    expect(ErrorResponseSchema.safeParse(secondPaidRes.body).success).toBe(true);

    const logs = await prisma.advance_audit_logs.findMany({
      where: { advance_id: requestRes.body.id, action: 'paid' }
    });
    expect(logs).toHaveLength(1);
  });

  it('returns 409 when marking non-approved advance', async () => {
    const company = await createCompany('Company B');
    const driver = await createDriver(company.id, 'driver@b.test');
    const companyUser = await createUser({ email: 'company@b.test', role: 'company', companyId: company.id });
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
      .post(`/advances/${advance.id}/mark-paid`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(409);
    expect(ErrorResponseSchema.safeParse(res.body).success).toBe(true);
  });

  it('other company cannot mark paid', async () => {
    const companyA = await createCompany('Company C');
    const companyB = await createCompany('Company D');
    const driver = await createDriver(companyA.id, 'driver@c.test');
    const companyUser = await createUser({ email: 'company@d.test', role: 'company', companyId: companyB.id });
    const token = await loginAndGetToken(companyUser.email, 'secret');

    const advance = await prisma.advances.create({
      data: {
        driver_id: driver.id,
        company_id: companyA.id,
        requested_amount: 10000n,
        requested_at: new Date(),
        status: 'approved'
      }
    });

    const app = buildApp();
    const res = await request(app)
      .post(`/advances/${advance.id}/mark-paid`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
    expect(ErrorResponseSchema.safeParse(res.body).success).toBe(true);
  });

  it('returns 404 when advance does not exist', async () => {
    const company = await createCompany('Company F');
    const companyUser = await createUser({ email: 'company@f.test', role: 'company', companyId: company.id });
    const token = await loginAndGetToken(companyUser.email, 'secret');

    const app = buildApp();
    const res = await request(app)
      .post('/advances/00000000-0000-0000-0000-000000000000/mark-paid')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(ErrorResponseSchema.safeParse(res.body).success).toBe(true);
  });

});
