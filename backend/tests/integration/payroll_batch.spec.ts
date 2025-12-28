import request from 'supertest';
import { buildApp } from '../helpers/app';
import { createCompany, createDriver, createPayroll } from '../helpers/factories';
import { createUser, loginAndGetToken } from '../helpers/auth';
import { prisma } from '../../src/repositories/prisma/client';

describe('[F06][SF02] payroll batch processing', () => {
  it('daily batch processes payroll and creates operator notification', async () => {
    const company = await createCompany('Company A');
    const driver = await createDriver(company.id, 'driver@a.test');
    const payroll = await createPayroll(driver.id, company.id, new Date());

    await prisma.advances.create({
      data: {
        driver_id: driver.id,
        company_id: company.id,
        requested_amount: 10000n,
        requested_at: new Date(),
        approved_amount: 10000n,
        fee_amount: 0n,
        payout_amount: 10000n,
        payout_date: new Date(),
        status: 'paid'
      }
    });
    await prisma.ledger_entries.create({
      data: {
        driver_id: driver.id,
        company_id: company.id,
        source_type: 'advance',
        source_id: payroll.id,
        entry_type: 'advance_principal',
        amount: 10000n,
        occurred_on: new Date()
      }
    });

    const operator = await createUser({ email: 'op@example.com', role: 'operator' });
    const token = await loginAndGetToken(operator.email, 'secret');

    const app = buildApp();
    const res = await request(app)
      .post('/admin/batch/daily')
      .set('Authorization', `Bearer ${token}`)
      .send({ targetDate: new Date().toISOString() });

    expect(res.status).toBe(200);

    const processed = await prisma.payrolls.findUnique({ where: { id: payroll.id } });
    expect(processed?.status).toBe('processed');

    const notifications = await prisma.notifications.findMany({ where: { recipient_type: 'operator' } });
    expect(notifications.length).toBeGreaterThan(0);
  });

  it('company role cannot run daily batch', async () => {
    const company = await createCompany('Company B');
    const user = await createUser({ email: 'company@b.test', role: 'company', companyId: company.id });
    const token = await loginAndGetToken(user.email, 'secret');

    const app = buildApp();
    const res = await request(app)
      .post('/admin/batch/daily')
      .set('Authorization', `Bearer ${token}`)
      .send({ targetDate: new Date().toISOString() });

    expect(res.status).toBe(403);
  });
});
