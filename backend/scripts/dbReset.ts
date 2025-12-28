import { spawn } from 'child_process';

const allowedHosts = new Set(['localhost', '127.0.0.1']);

const parseDatabaseUrl = (urlValue: string) => {
  let url: URL;
  try {
    url = new URL(urlValue);
  } catch {
    throw new Error('DATABASE_URL is not a valid URL');
  }

  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error(`DATABASE_URL must be postgres, got ${url.protocol}`);
  }

  const host = url.hostname;
  const dbName = url.pathname.replace(/^\//, '');
  return { host, dbName };
};

const isLocalDbName = (dbName: string) => {
  if (!dbName) return false;
  const lower = dbName.toLowerCase();
  const hasProjectName = lower.includes('driver_advance_accounting');
  const hasLocalSuffix = lower.includes('_test') || lower.includes('_dev');
  return hasProjectName && hasLocalSuffix;
};

const runCommand = (command: string, args: string[]) =>
  new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' });
    child.on('error', (error) => reject(error));
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} ${args.join(' ')} failed with code ${code}`));
    });
  });

const main = async () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('db:reset blocked: DATABASE_URL is not set');
    process.exit(1);
  }

  let host: string;
  let dbName: string;
  try {
    ({ host, dbName } = parseDatabaseUrl(databaseUrl));
  } catch (error) {
    console.error(`db:reset blocked: ${(error as Error).message}`);
    process.exit(1);
  }

  if (!allowedHosts.has(host)) {
    console.error(`db:reset blocked: host must be localhost/127.0.0.1 (got ${host})`);
    process.exit(1);
  }

  if (!isLocalDbName(dbName)) {
    console.error(
      `db:reset blocked: database name must include driver_advance_accounting and _test/_dev (got ${dbName})`
    );
    process.exit(1);
  }

  const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

  await runCommand(npxCmd, ['prisma', 'migrate', 'reset', '--force', '--skip-generate']);
  await runCommand(npmCmd, ['run', 'db:seed']);
};

main().catch((error) => {
  console.error('db:reset failed', error);
  process.exit(1);
});
