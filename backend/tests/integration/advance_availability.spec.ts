import request from 'supertest';
import { buildApp } from '../helpers/app';
import { createCompany, createDriver } from '../helpers/factories';
import { createUser, loginAndGetToken } from '../helpers/auth';
import { prisma } from '../../src/repositories/prisma/client';
import { monthStart } from '../../src/domain/dates';
import { ErrorResponseSchema } from '../contracts/schemas';

describe('[F03][SF01] advance availability', () => {
  it('returns available and deducted amounts', async () => {
    const company = await createCompany('Company A');
    const driver = await createDriver(company.id, 'driver@a.test');
    const user = await createUser({ email: 'driver@a.test', role: 'driver', driverId: driver.id, companyId: company.id });
    const token = await loginAndGetToken(user.email, 'secret');

    const currentMonth = monthStart(new Date());
    await prisma.earnings.create({
      data: {
        driver_id: driver.id,
        company_id: company.id,
        work_month: currentMonth,
        payout_month: currentMonth,
        amount: 50000n,
        status: 'confirmed'
      }
    });

    await prisma.ledger_entries.create({
      data: {
        driver_id: driver.id,
        company_id: company.id,
        source_type: 'advance',
        source_id: driver.id,
        entry_type: 'advance_principal',
        amount: 10000n,
        occurred_on: currentMonth
      }
    });

    const app = buildApp();
    const res = await request(app)
      .get(`/drivers/${driver.id}/advance-availability`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.availableAmount).toBe('30000');
    expect(res.body.deductedAmount).toBe('10000');
  });

  it('forbids other driver access', async () => {
    const company = await createCompany('Company B');
    const driver = await createDriver(company.id, 'driver@b.test');
    const otherDriver = await createDriver(company.id, 'driver@c.test');
    const user = await createUser({ email: 'driver@c.test', role: 'driver', driverId: otherDriver.id, companyId: company.id });
    const token = await loginAndGetToken(user.email, 'secret');

    const app = buildApp();
    const res = await request(app)
      .get(`/drivers/${driver.id}/advance-availability`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(ErrorResponseSchema.safeParse(res.body).success).toBe(true);
  });
});
