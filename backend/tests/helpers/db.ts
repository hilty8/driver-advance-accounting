import { execSync } from 'child_process';
import { prisma } from '../../src/repositories/prisma/client';

const isTestDatabase = (databaseUrl?: string) => {
  if (!databaseUrl) return false;
  return databaseUrl.includes('_test');
};

const getDatabaseName = (databaseUrl?: string) => {
  if (!databaseUrl) return 'unknown';
  try {
    return new URL(databaseUrl).pathname.replace('/', '') || 'unknown';
  } catch {
    return 'unknown';
  }
};

export const migrateTestDb = () => {
  if (!isTestDatabase(process.env.DATABASE_URL)) {
    const dbName = getDatabaseName(process.env.DATABASE_URL);
    throw new Error(`DATABASE_URL must point to a test database (suffix "_test"), got "${dbName}"`);
  }
  execSync('npx prisma migrate deploy', { stdio: 'inherit', env: process.env });
};

export const resetTestDb = async () => {
  if (!isTestDatabase(process.env.DATABASE_URL)) {
    const dbName = getDatabaseName(process.env.DATABASE_URL);
    throw new Error(`DATABASE_URL must point to a test database (suffix "_test"), got "${dbName}"`);
  }

  const tables = await prisma.$queryRaw<
    Array<{ tablename: string }>
  >`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`;

  const target = tables
    .map((row) => row.tablename)
    .filter((name) => name !== '_prisma_migrations');

  if (target.length === 0) return;

  const statement = `TRUNCATE TABLE ${target.map((t) => `"public"."${t}"`).join(', ')} RESTART IDENTITY CASCADE;`;
  await prisma.$executeRawUnsafe(statement);
};
