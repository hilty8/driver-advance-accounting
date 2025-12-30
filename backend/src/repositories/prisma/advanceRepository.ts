import type { Prisma, PrismaClient } from '@prisma/client';
import { advances as PrismaAdvance } from '@prisma/client';
import { Advance, UUID } from '../../domain/types';
import { AdvanceRepository } from '../interfaces';
import { prisma } from './client';

const mapAdvance = (row: PrismaAdvance): Advance => ({
  id: row.id,
  driverId: row.driver_id,
  companyId: row.company_id,
  requestedAmount: BigInt(row.requested_amount),
  requestedAt: row.requested_at,
  approvedAmount: row.approved_amount ? BigInt(row.approved_amount) : undefined,
  feeAmount: row.fee_amount ? BigInt(row.fee_amount) : undefined,
  payoutAmount: row.payout_amount ? BigInt(row.payout_amount) : undefined,
  payoutDate: row.payout_date ?? undefined,
  status: row.status,
  memo: row.memo ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

export class PrismaAdvanceRepository implements AdvanceRepository {
  private readonly client: PrismaClient | Prisma.TransactionClient;

  constructor(client: PrismaClient | Prisma.TransactionClient = prisma) {
    this.client = client;
  }

  async findById(id: UUID): Promise<Advance | null> {
    const row = await this.client.advances.findUnique({ where: { id } });
    return row ? mapAdvance(row) : null;
  }

  async save(advance: Advance): Promise<Advance> {
    // TODO: expand to update nested relations; for now upsert by id.
    const row = await this.client.advances.upsert({
      where: { id: advance.id },
      update: {
        driver_id: advance.driverId,
        company_id: advance.companyId,
        requested_amount: advance.requestedAmount,
        requested_at: advance.requestedAt,
        approved_amount: advance.approvedAmount ?? null,
        fee_amount: advance.feeAmount ?? null,
        payout_amount: advance.payoutAmount ?? null,
        payout_date: advance.payoutDate ?? null,
        status: advance.status,
        memo: advance.memo ?? null,
        updated_at: new Date()
      },
      create: {
        id: advance.id,
        driver_id: advance.driverId,
        company_id: advance.companyId,
        requested_amount: advance.requestedAmount,
        requested_at: advance.requestedAt,
        approved_amount: advance.approvedAmount ?? null,
        fee_amount: advance.feeAmount ?? null,
        payout_amount: advance.payoutAmount ?? null,
        payout_date: advance.payoutDate ?? null,
        status: advance.status,
        memo: advance.memo ?? null
      }
    });
    return mapAdvance(row);
  }

  async listPendingForCompany(companyId: UUID): Promise<Advance[]> {
    const rows = await this.client.advances.findMany({
      where: { company_id: companyId, status: 'requested' }
    });
    return rows.map(mapAdvance);
  }
}
