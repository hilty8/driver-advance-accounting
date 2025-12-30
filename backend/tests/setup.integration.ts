import { config } from 'dotenv';
import path from 'node:path';
import { migrateTestDb, resetTestDb } from './helpers/db';
import { prisma } from '../src/repositories/prisma/client';

delete process.env.DATABASE_URL;
delete process.env.JWT_SECRET;
config({ path: path.resolve(__dirname, '../.env.test'), override: true });

let migrated = false;

beforeAll(async () => {
  if (!migrated) {
    migrateTestDb();
    migrated = true;
  }
});

beforeEach(async () => {
  await resetTestDb();
});

afterAll(async () => {
  await prisma.$disconnect();
});

jest.mock('../src/integrations/stripeClient', () => ({
  getStripeClient: () => ({
    invoiceItems: { create: jest.fn().mockResolvedValue({ id: 'ii_test' }) },
    invoices: {
      create: jest.fn().mockResolvedValue({ id: 'in_test' }),
      finalizeInvoice: jest.fn().mockResolvedValue({ id: 'in_test' }),
      sendInvoice: jest.fn().mockResolvedValue({ id: 'in_test' })
    },
    customers: { create: jest.fn().mockResolvedValue({ id: 'cus_test' }) }
  })
}));

jest.mock('../src/integrations/smtpMailer', () => ({
  createMailerFromEnv: () => ({
    sendPasswordReset: jest.fn().mockResolvedValue(undefined),
    sendIdReminder: jest.fn().mockResolvedValue(undefined),
    sendDriverInvite: jest.fn().mockResolvedValue(undefined)
  })
}));
