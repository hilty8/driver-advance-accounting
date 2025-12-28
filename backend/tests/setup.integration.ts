import { config } from 'dotenv';
import path from 'path';
import { migrateTestDb, resetTestDb } from './helpers/db';
import { prisma } from '../src/repositories/prisma/client';

config({ path: path.resolve(__dirname, '../.env.test') });

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
