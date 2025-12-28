import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/domain/passwords';

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'admin@example.com';
const ADMIN_PASSWORD = 'Passw0rd!';

const main = async () => {
  const existing = await prisma.users.findUnique({ where: { email: ADMIN_EMAIL } });
  if (existing) {
    console.log(`seed: user already exists, skipped (${ADMIN_EMAIL})`);
    return;
  }

  await prisma.users.create({
    data: {
      email: ADMIN_EMAIL,
      password_hash: hashPassword(ADMIN_PASSWORD),
      role: 'admin',
      is_active: true
    }
  });

  console.log(`seed: admin user created (${ADMIN_EMAIL})`);
};

main()
  .catch((error) => {
    console.error('seed failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
