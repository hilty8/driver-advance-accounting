import type { Prisma, PrismaClient } from '@prisma/client';
import { ledger_entries as PrismaLedger } from '@prisma/client';
import { LedgerEntry, UUID, Yen } from '../../domain/types';
import { LedgerRepository } from '../interfaces';
import { prisma } from './client';
import { computeAdvanceBalanceFromGrouped } from './ledgerAggregation';

const mapLedger = (row: PrismaLedger): LedgerEntry => ({
  id: row.id,
  driverId: row.driver_id,
  companyId: row.company_id,
  sourceType: row.source_type,
  sourceId: row.source_id,
  entryType: row.entry_type,
  amount: BigInt(row.amount),
  occurredOn: row.occurred_on,
  createdAt: row.created_at
});

export class PrismaLedgerRepository implements LedgerRepository {
  private readonly client: PrismaClient | Prisma.TransactionClient;

  constructor(client: PrismaClient | Prisma.TransactionClient = prisma) {
    this.client = client;
  }

  async insert(entry: Omit<LedgerEntry, 'id' | 'createdAt'>): Promise<LedgerEntry> {
    const row = await this.client.ledger_entries.create({
      data: {
        driver_id: entry.driverId,
        company_id: entry.companyId,
        source_type: entry.sourceType,
        source_id: entry.sourceId,
        entry_type: entry.entryType,
        amount: entry.amount,
        occurred_on: entry.occurredOn
      }
    });
    return mapLedger(row);
  }

  async sumAdvanceBalance(driverId: UUID, companyId: UUID, asOf: Date): Promise<Yen> {
    const grouped = (await (prisma.ledger_entries as any).groupBy({
      by: ['entry_type'],
      where: {
        driver_id: driverId,
        company_id: companyId,
        occurred_on: { lte: asOf }
      },
      _sum: { amount: true }
    })) as Array<{ entry_type: string; _sum: { amount: bigint | null } }>;
    return computeAdvanceBalanceFromGrouped(
      grouped.map((row) => ({
        entry_type: row.entry_type as 'advance_principal' | 'collection' | 'write_off' | 'fee',
        _sum: { amount: row._sum.amount ? BigInt(row._sum.amount) : 0n }
      }))
    );
  }
}
