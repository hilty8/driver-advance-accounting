import { metrics_monthly as PrismaMetrics } from '@prisma/client';
import { MetricsMonthly } from '../../domain/types';
import { MetricsRepository } from '../interfaces';
import { prisma } from './client';

const mapMetrics = (row: PrismaMetrics): MetricsMonthly => ({
  id: row.id,
  companyId: row.company_id ?? undefined,
  yearMonth: row.year_month,
  totalAdvancePrincipal: BigInt(row.total_advance_principal),
  totalFeeRevenue: BigInt(row.total_fee_revenue),
  totalCollectedPrincipal: BigInt(row.total_collected_principal),
  totalWrittenOffPrincipal: BigInt(row.total_written_off_principal),
  createdAt: row.created_at,
  updatedAt: row.updated_at
});

export class PrismaMetricsRepository implements MetricsRepository {
  async upsertMonthlyMetrics(record: MetricsMonthly): Promise<MetricsMonthly> {
    if (!record.companyId) {
      const existing = await prisma.metrics_monthly.findFirst({
        where: {
          company_id: null,
          year_month: record.yearMonth
        }
      });

      const row = existing
        ? await prisma.metrics_monthly.update({
          where: { id: existing.id },
          data: {
            total_advance_principal: record.totalAdvancePrincipal,
            total_fee_revenue: record.totalFeeRevenue,
            total_collected_principal: record.totalCollectedPrincipal,
            total_written_off_principal: record.totalWrittenOffPrincipal,
            updated_at: new Date()
          }
        })
        : await prisma.metrics_monthly.create({
          data: {
            id: record.id,
            company_id: null,
            year_month: record.yearMonth,
            total_advance_principal: record.totalAdvancePrincipal,
            total_fee_revenue: record.totalFeeRevenue,
            total_collected_principal: record.totalCollectedPrincipal,
            total_written_off_principal: record.totalWrittenOffPrincipal
          }
        });

      return mapMetrics(row);
    }

    const row = await prisma.metrics_monthly.upsert({
      where: {
        company_id_year_month: {
          company_id: record.companyId,
          year_month: record.yearMonth
        }
      },
      update: {
        total_advance_principal: record.totalAdvancePrincipal,
        total_fee_revenue: record.totalFeeRevenue,
        total_collected_principal: record.totalCollectedPrincipal,
        total_written_off_principal: record.totalWrittenOffPrincipal,
        updated_at: new Date()
      },
      create: {
        id: record.id,
        company_id: record.companyId ?? null,
        year_month: record.yearMonth,
        total_advance_principal: record.totalAdvancePrincipal,
        total_fee_revenue: record.totalFeeRevenue,
        total_collected_principal: record.totalCollectedPrincipal,
        total_written_off_principal: record.totalWrittenOffPrincipal
      }
    });
    return mapMetrics(row);
  }
}
