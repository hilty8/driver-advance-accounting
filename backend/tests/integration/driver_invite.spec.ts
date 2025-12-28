import request from 'supertest';
import { buildApp } from '../helpers/app';
import { createCompany } from '../helpers/factories';
import { createUser, loginAndGetToken } from '../helpers/auth';
import { ErrorResponseSchema } from '../contracts/schemas';
import { newUuid } from '../../src/domain/ids';
import { prisma } from '../../src/repositories/prisma/client';

describe('[F02][SF01] driver invite create', () => {
  it('company can create driver and invite', async () => {
    const company = await createCompany('Company A');
    const user = await createUser({ email: 'company@example.com', role: 'company', companyId: company.id });
    const token = await loginAndGetToken(user.email, 'secret');

    const app = buildApp();
    const driverRes = await request(app)
      .post('/drivers')
      .set('Authorization', `Bearer ${token}`)
      .send({ companyId: company.id, name: 'Driver A', email: 'driver@a.test' });

    expect(driverRes.status).toBe(201);
    const driverId = driverRes.body.id;

    const inviteRes = await request(app)
      .post(`/drivers/${driverId}/invite`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(inviteRes.status).toBe(201);
    const invitation = await prisma.driver_invitations.findFirst({ where: { driver_id: driverId } });
    expect(invitation).toBeTruthy();
  });

  it('invite with invalid driver id returns 404', async () => {
    const company = await createCompany('Company B');
    const user = await createUser({ email: 'company-b@example.com', role: 'company', companyId: company.id });
    const token = await loginAndGetToken(user.email, 'secret');

    const app = buildApp();
    const res = await request(app)
      .post(`/drivers/${newUuid()}/invite`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(404);
    expect(ErrorResponseSchema.safeParse(res.body).success).toBe(true);
  });
});

describe('[F02][SF02] driver invite accept', () => {
  it('driver can accept invite', async () => {
    const company = await createCompany('Company C');
    const user = await createUser({ email: 'company-c@example.com', role: 'company', companyId: company.id });
    const token = await loginAndGetToken(user.email, 'secret');

    const app = buildApp();
    const driverRes = await request(app)
      .post('/drivers')
      .set('Authorization', `Bearer ${token}`)
      .send({ companyId: company.id, name: 'Driver C', email: 'driver@c.test' });

    expect(driverRes.status).toBe(201);
    const driverId = driverRes.body.id;

    const inviteRes = await request(app)
      .post(`/drivers/${driverId}/invite`)
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(inviteRes.status).toBe(201);
    const invitation = await prisma.driver_invitations.findFirst({ where: { driver_id: driverId } });
    expect(invitation).toBeTruthy();

    const acceptRes = await request(app)
      .post('/driver-invitations/accept')
      .send({ token: invitation!.token, password: 'driverpass' });

    expect(acceptRes.status).toBe(201);
    expect(acceptRes.body.role).toBe('driver');
  });
});
