import { prisma } from '../repositories/prisma/client';
import { jsonError } from './errors';

const toCsv = (header: string[], rows: string[][]): string => {
  const lines = [header.join(',')];
  for (const row of rows) {
    lines.push(row.map((value) => `${value}`).join(','));
  }
  return `${lines.join('\n')}\n`;
};

const formatRate = (numerator: bigint, denominator: bigint): string => {
  if (denominator === 0n) return '0.0000';
  const scaled = (numerator * 10000n) / denominator;
  const whole = scaled / 10000n;
  const frac = (scaled % 10000n).toString().padStart(4, '0');
  return `${whole.toString()}.${frac}`;
};

type HandlerResponse = {
  status: number;
  body: string;
};

export const exportDriverBalancesCsv = async (companyId?: string): Promise<HandlerResponse> => {
  if (companyId !== undefined && companyId.trim() === '') {
    return { status: 400, body: JSON.stringify(jsonError('invalid companyId')) };
  }
  const balances = await prisma.driver_balances_materialized.findMany({
    where: companyId ? { company_id: companyId } : undefined,
    include: { driver: true }
  });

  const header = [
    'driver_id',
    'driver_name',
    'advance_balance',
    'unpaid_confirmed_earnings',
    'advance_limit'
  ];

  const rows = balances.map((row) => [
    row.driver_id,
    row.driver.name,
    row.advance_balance.toString(),
    row.unpaid_confirmed_earnings.toString(),
    row.advance_limit.toString()
  ]);

  return { status: 200, body: toCsv(header, rows) };
};

export const exportMonthlyMetricsCsv = async (companyId?: string, yearMonth?: string): Promise<HandlerResponse> => {
  if (companyId !== undefined && companyId.trim() === '') {
    return { status: 400, body: JSON.stringify(jsonError('invalid companyId')) };
  }
  const where: { company_id?: string; year_month?: Date } = {};
  if (companyId) where.company_id = companyId;
  if (yearMonth) {
    if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
      return { status: 400, body: JSON.stringify(jsonError('invalid yearMonth')) };
    }
    const [year, month] = yearMonth.split('-').map(Number);
    where.year_month = new Date(Date.UTC(year, month - 1, 1));
  }

  const metrics = await prisma.metrics_monthly.findMany({
    where: Object.keys(where).length ? where : undefined,
    orderBy: [{ year_month: 'asc' }, { company_id: 'asc' }]
  });

  const header = [
    'company_id',
    'year_month',
    'total_advance_principal',
    'total_fee_revenue',
    'total_collected_principal',
    'total_written_off_principal',
    'collection_rate'
  ];

  const rows = metrics.map((row) => {
    const collectionRate = formatRate(
      BigInt(row.total_collected_principal),
      BigInt(row.total_advance_principal)
    );

    return [
      row.company_id ?? '',
      row.year_month.toISOString().slice(0, 10),
      row.total_advance_principal.toString(),
      row.total_fee_revenue.toString(),
      row.total_collected_principal.toString(),
      row.total_written_off_principal.toString(),
      collectionRate
    ];
  });

  return { status: 200, body: toCsv(header, rows) };
};
