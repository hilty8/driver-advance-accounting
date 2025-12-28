import request from 'supertest';
import { buildApp } from '../helpers/app';
import { createCompany, createDriver } from '../helpers/factories';
import { createUser, loginAndGetToken } from '../helpers/auth';
import { prisma } from '../../src/repositories/prisma/client';

describe('[F06][SF01] payroll payout date calculation', () => {
  it('payout_month uses company payout_day', async () => {
    const company = await prisma.companies.create({
      data: {
        name: 'Company A',
        limit_rate: 0.8,
        fee_rate: 0.05,
        payout_day: 25,
        payout_day_is_month_end: false,
        payout_offset_months: 2,
        allow_advance_over_salary: false
      }
    });
    const driver = await createDriver(company.id, 'driver@a.test');
    const user = await createUser({ email: 'company@a.test', role: 'company', companyId: company.id });
    const token = await loginAndGetToken(user.email, 'secret');

    const csv = 'driver_external_id,payout_month,gross_salary_amount\n'
      + `${driver.id},2025-01,10000\n`;

    const app = buildApp();
    const res = await request(app)
      .post('/payrolls/import')
      .set('Authorization', `Bearer ${token}`)
      .send(csv);

    expect(res.status).toBe(200);
    const payroll = await prisma.payrolls.findFirst({ where: { driver_id: driver.id } });
    expect(payroll).toBeTruthy();
    expect(payroll!.payout_date.toISOString().slice(0, 10)).toBe('2025-01-24');
  });

  it('missing payout_day returns error in 207 response', async () => {
    const company = await prisma.companies.create({
      data: {
        name: 'Company B',
        limit_rate: 0.8,
        fee_rate: 0.05,
        payout_day_is_month_end: false,
        payout_offset_months: 2,
        allow_advance_over_salary: false
      }
    });
    const driver = await createDriver(company.id, 'driver@b.test');
    const user = await createUser({ email: 'company@b.test', role: 'company', companyId: company.id });
    const token = await loginAndGetToken(user.email, 'secret');

    const csv = 'driver_external_id,payout_month,gross_salary_amount\n'
      + `${driver.id},2025-01,10000\n`;

    const app = buildApp();
    const res = await request(app)
      .post('/payrolls/import')
      .set('Authorization', `Bearer ${token}`)
      .send(csv);

    expect(res.status).toBe(207);
    expect(Array.isArray(res.body.errors)).toBe(true);
  });
});
