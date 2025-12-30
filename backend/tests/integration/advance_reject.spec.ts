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
      .send({ reason: '理由あり' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('rejected');

    const logs = await prisma.advance_audit_logs.findMany({
      where: { advance_id: advance.id }
    });
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe('rejected');
    expect(logs[0].reason).toBe('理由あり');
    expect(logs[0].actor_user_id).toBe(companyUser.id);
    expect(logs[0].company_id).toBe(company.id);
    expect(logs[0].driver_id).toBe(driver.id);
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

  it('returns 409 when rejecting non-requested advance', async () => {
    const company = await createCompany('Company C');
    const driver = await createDriver(company.id, 'driver@c.test');
    const companyUser = await createUser({ email: 'company@c.test', role: 'company', companyId: company.id });
    const token = await loginAndGetToken(companyUser.email, 'secret');

    const advance = await prisma.advances.create({
      data: {
        driver_id: driver.id,
        company_id: company.id,
        requested_amount: 10000n,
        requested_at: new Date(),
        status: 'approved'
      }
    });

    const app = buildApp();
    const res = await request(app)
      .post(`/advances/${advance.id}/reject`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: '理由あり' });

    expect(res.status).toBe(409);
    expect(ErrorResponseSchema.safeParse(res.body).success).toBe(true);
  });

  it('reject reason is required and must be within 500 chars', async () => {
    const company = await createCompany('Company D');
    const driver = await createDriver(company.id, 'driver@d.test');
    const companyUser = await createUser({ email: 'company@d.test', role: 'company', companyId: company.id });
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
    const emptyRes = await request(app)
      .post(`/advances/${advance.id}/reject`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: '   ' });
    expect(emptyRes.status).toBe(400);
    expect(ErrorResponseSchema.safeParse(emptyRes.body).success).toBe(true);

    const longReason = 'x'.repeat(501);
    const longRes = await request(app)
      .post(`/advances/${advance.id}/reject`)
      .set('Authorization', `Bearer ${token}`)
      .send({ reason: longReason });
    expect(longRes.status).toBe(400);
    expect(ErrorResponseSchema.safeParse(longRes.body).success).toBe(true);
  });
});
