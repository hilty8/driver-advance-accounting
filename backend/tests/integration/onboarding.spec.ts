import request from 'supertest';
import { buildApp } from '../helpers/app';
import { createCompany } from '../helpers/factories';
import { createUser, loginAndGetToken } from '../helpers/auth';
import { ErrorResponseSchema } from '../contracts/schemas';

describe('[F09][SF01] onboarding', () => {
  it('operator can onboard company', async () => {
    await createCompany('Existing'); // ensure db has at least one row
    const operator = await createUser({ email: 'op@example.com', role: 'operator' });
    const token = await loginAndGetToken(operator.email, 'secret');

    const app = buildApp();
    const res = await request(app)
      .post('/onboarding/company')
      .set('Authorization', `Bearer ${token}`)
      .send({
        companyName: 'New Co',
        adminEmail: 'admin@newco.test',
        adminPassword: 'secret',
        payoutDayIsMonthEnd: false,
        payoutDay: 25
      });

    expect(res.status).toBe(201);
    expect(res.body.company.name).toBe('New Co');
    expect(res.body.user.email).toBe('admin@newco.test');
  });

  it('company role cannot onboard company', async () => {
    const company = await createCompany('Company A');
    const user = await createUser({ email: 'company@example.com', role: 'company', companyId: company.id });
    const token = await loginAndGetToken(user.email, 'secret');

    const app = buildApp();
    const res = await request(app)
      .post('/onboarding/company')
      .set('Authorization', `Bearer ${token}`)
      .send({ companyName: 'Denied Co', adminEmail: 'x@y.test', adminPassword: 'secret' });

    expect(res.status).toBe(403);
    expect(ErrorResponseSchema.safeParse(res.body).success).toBe(true);
  });
});
