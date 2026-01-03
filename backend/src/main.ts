import fs from 'node:fs';
import path from 'node:path';
import { startServer } from './http/server';
import { prisma } from './repositories/prisma/client';

if (process.env.NODE_ENV !== 'production') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('dotenv/config');
}

const loadLocalMigrationNames = () => {
  const migrationsDir = path.resolve(__dirname, '../prisma/migrations');
  if (!fs.existsSync(migrationsDir)) return [];
  return fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
};

const loadAppliedMigrationNames = async () => {
  try {
    const rows = await prisma.$queryRaw<{ migration_name: string }[]>`
      SELECT migration_name
      FROM _prisma_migrations
      WHERE finished_at IS NOT NULL
        AND rolled_back_at IS NULL
    `;
    return rows.map((row) => row.migration_name);
  } catch {
    return [];
  }
};

const warnMissingMigrations = (missing: string[]) => {
  const message = [
    '[migrations] 未適用のマイグレーションがあります。',
    missing.length ? `- missing: ${missing.join(', ')}` : '- missing: (unknown)',
    '対処コマンド:',
    'cd backend && npx prisma migrate dev',
    'cd backend && SEED_MODE=dev npm run db:seed',
    'backend を再起動（cd backend && npm run dev）',
    '日常運用向け: cd backend && npm run dev:reset'
  ].join('\n');
  // eslint-disable-next-line no-console
  console.warn(message);
};

const checkMigrations = async () => {
  if (process.env.NODE_ENV === 'test' || process.env.NODE_ENV === 'production') return;
  try {
    await prisma.$connect();
    const [local, applied] = await Promise.all([
      loadLocalMigrationNames(),
      loadAppliedMigrationNames()
    ]);
    const appliedSet = new Set(applied);
    const missing = local.filter((name) => !appliedSet.has(name));
    if (missing.length > 0) warnMissingMigrations(missing);
  } catch {
    warnMissingMigrations([]);
  }
};

const main = async () => {
  const port = Number(process.env.PORT ?? 3000);
  await checkMigrations();
  startServer(port);
  // eslint-disable-next-line no-console
  console.log(`server started on ${port}`);
};

void main();
