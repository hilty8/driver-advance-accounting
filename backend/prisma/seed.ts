import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/domain/passwords';
import { monthStart } from '../src/domain/dates';

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'Passw0rd!';
const COMPANY_EMAIL = 'company@example.com';
const DRIVER_EMAIL = 'driver@example.com';
const DEV_COMPANY_NAME = 'Dev Company';

const main = async () => {
  const existing = await prisma.users.findUnique({ where: { email: ADMIN_EMAIL } });
  if (existing) {
    console.log(`seed: user already exists, skipped (${ADMIN_EMAIL})`);
  } else {
    await prisma.users.create({
      data: {
        email: ADMIN_EMAIL,
        password_hash: hashPassword(ADMIN_PASSWORD),
        role: 'admin',
        is_active: true
      }
    });

    console.log(`seed: admin user created (${ADMIN_EMAIL})`);
  }

  if (process.env.SEED_MODE !== 'dev') return;

  const existingCompanyUser = await prisma.users.findUnique({ where: { email: COMPANY_EMAIL } });
  const existingDriverUser = await prisma.users.findUnique({ where: { email: DRIVER_EMAIL } });

  let companyId = existingCompanyUser?.company_id ?? null;
  if (!companyId) {
    const existingCompany = await prisma.companies.findFirst({ where: { name: DEV_COMPANY_NAME } });
    if (existingCompany) {
      companyId = existingCompany.id;
    } else {
      const createdCompany = await prisma.companies.create({
        data: {
          name: DEV_COMPANY_NAME
        }
      });
      companyId = createdCompany.id;
    }
  }

  if (!existingCompanyUser) {
    await prisma.users.create({
      data: {
        email: COMPANY_EMAIL,
        password_hash: hashPassword(ADMIN_PASSWORD),
        role: 'company',
        company_id: companyId,
        is_active: true
      }
    });
    console.log(`seed: company user created (${COMPANY_EMAIL})`);
  } else {
    console.log(`seed: user already exists, skipped (${COMPANY_EMAIL})`);
  }

  let driverId = existingDriverUser?.driver_id ?? null;
  if (!driverId) {
    const existingDriver = await prisma.drivers.findFirst({ where: { email: DRIVER_EMAIL } });
    if (existingDriver) {
      driverId = existingDriver.id;
    } else {
      const createdDriver = await prisma.drivers.create({
        data: {
          company_id: companyId,
          name: 'Dev Driver',
          email: DRIVER_EMAIL,
          is_active: true
        }
      });
      driverId = createdDriver.id;
    }
  }

  if (!existingDriverUser) {
    await prisma.users.create({
      data: {
        email: DRIVER_EMAIL,
        password_hash: hashPassword(ADMIN_PASSWORD),
        role: 'driver',
        company_id: companyId,
        driver_id: driverId,
        is_active: true
      }
    });
    console.log(`seed: driver user created (${DRIVER_EMAIL})`);
  } else {
    console.log(`seed: user already exists, skipped (${DRIVER_EMAIL})`);
  }

  if (driverId) {
    const currentMonth = monthStart(new Date());
    const existingEarning = await prisma.earnings.findFirst({
      where: {
        driver_id: driverId,
        company_id: companyId,
        payout_month: currentMonth,
        status: 'confirmed'
      }
    });
    if (!existingEarning) {
      await prisma.earnings.create({
        data: {
          driver_id: driverId,
          company_id: companyId,
          work_month: currentMonth,
          payout_month: currentMonth,
          amount: 200000n,
          status: 'confirmed'
        }
      });
      console.log(`seed: earnings created for (${DRIVER_EMAIL})`);
    } else {
      console.log(`seed: earnings already exist for (${DRIVER_EMAIL})`);
    }
  }
};

main()
  .catch((error) => {
    console.error('seed failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
