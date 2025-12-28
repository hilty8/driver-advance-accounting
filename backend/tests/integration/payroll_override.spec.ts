import request from 'supertest';
import { buildApp } from '../helpers/app';
import { createCompany, createDriver, createPayroll } from '../helpers/factories';
import { createUser, loginAndGetToken } from '../helpers/auth';
import { ErrorResponseSchema } from '../contracts/schemas';
import { prisma } from '../../src/repositories/prisma/client';

describe('[F07][SF01] payroll collection override', () => {
  it('company can override collection amount', async () => {
    const company = await createCompany('Company A');
    const driver = await createDriver(company.id, 'driver@a.test');
    const payroll = await createPayroll(driver.id, company.id, new Date());
    const user = await createUser({ email: 'company@a.test', role: 'company', companyId: company.id });
    const token = await loginAndGetToken(user.email, 'secret');

    const app = buildApp();
    const res = await request(app)
      .post(`/payrolls/${payroll.id}/collection-override`)
      .set('Authorization', `Bearer ${token}`)
      .send({ collectionAmount: '1000', reason: 'manual' });

    expect(res.status).toBe(200);
    expect(res.body.collection_override_amount).toBeDefined();
  });

  it('processed payroll cannot be overridden', async () => {
    const company = await createCompany('Company B');
    const driver = await createDriver(company.id, 'driver@b.test');
    const payroll = await prisma.payrolls.create({
      data: {
        driver_id: driver.id,
        company_id: company.id,
        payout_date: new Date(),
        gross_salary_amount: 10000n,
        advance_collection_amount: 1000n,
        status: 'processed'
      }
    });
    const user = await createUser({ email: 'company@b.test', role: 'company', companyId: company.id });
    const token = await loginAndGetToken(user.email, 'secret');

    const app = buildApp();
    const res = await request(app)
      .post(`/payrolls/${payroll.id}/collection-override`)
      .set('Authorization', `Bearer ${token}`)
      .send({ collectionAmount: '1000' });

    expect(res.status).toBe(409);
    expect(ErrorResponseSchema.safeParse(res.body).success).toBe(true);
  });
});
