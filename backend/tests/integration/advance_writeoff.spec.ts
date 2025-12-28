import request from 'supertest';
import { buildApp } from '../helpers/app';
import { createCompany, createDriver } from '../helpers/factories';
import { createUser, loginAndGetToken } from '../helpers/auth';
import { ErrorResponseSchema } from '../contracts/schemas';
import { newUuid } from '../../src/domain/ids';
import { prisma } from '../../src/repositories/prisma/client';

describe('[F07][SF02] advance write-off', () => {
  it('company can write off advance balance', async () => {
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
        source_id: advance.id,
        entry_type: 'advance_principal',
        amount: 10000n,
        occurred_on: new Date()
      }
    });

    const app = buildApp();
    const res = await request(app)
      .post(`/advances/${advance.id}/write-off`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: '5000' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('written_off');
  });

  it('write-off for missing advance returns 404', async () => {
    const company = await createCompany('Company B');
    const user = await createUser({ email: 'company@b.test', role: 'company', companyId: company.id });
    const token = await loginAndGetToken(user.email, 'secret');

    const app = buildApp();
    const res = await request(app)
      .post(`/advances/${newUuid()}/write-off`)
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: '1000' });

    expect(res.status).toBe(404);
    expect(ErrorResponseSchema.safeParse(res.body).success).toBe(true);
  });
});
