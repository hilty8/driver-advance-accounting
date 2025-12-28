import { prisma } from '../repositories/prisma/client';
import { parseCsv, parseMonth, parsePositiveBigInt, validateRowLength, CsvError, toCsv } from './csv';
import { addMonths } from '../domain/dates';
import { jsonError } from './errors';

const REQUIRED_HEADER = ['driver_external_id', 'work_month', 'payout_month', 'amount'];

type HandlerInput = {
  body: string;
};

type HandlerResponse = {
  status: number;
  body: unknown;
};

export const createEarningsImportHandler = () => {
  return async (input: HandlerInput): Promise<HandlerResponse> => {
    const { header, rows } = parseCsv(input.body);
    if (header.length === 0) {
      return { status: 400, body: jsonError('empty csv') };
    }

    const normalizedHeader = header.map((h) => h.toLowerCase());
    if (normalizedHeader.join(',') !== REQUIRED_HEADER.join(',')) {
      return { status: 400, body: jsonError('invalid header', { expected: REQUIRED_HEADER, actual: header }) };
    }

    const errors: CsvError[] = [];
    const validRows: { driverId: string; workMonth: Date; payoutMonth: Date | null; amount: bigint; row: number }[] = [];

    for (let i = 0; i < rows.length; i += 1) {
      const rowNumber = i + 2;
      const row = rows[i];
      if (!validateRowLength(row, header, rowNumber, errors)) continue;

      const driverId = row[0];
      const workMonth = parseMonth(row[1]);
      const payoutMonth = row[2] ? parseMonth(row[2]) : null;
      const amount = parsePositiveBigInt(row[3]);

      if (!driverId) errors.push({ row: rowNumber, message: 'driver_external_id is required' });
      if (!workMonth) errors.push({ row: rowNumber, message: 'work_month must be YYYY-MM' });
      if (!payoutMonth && row[2]) errors.push({ row: rowNumber, message: 'payout_month must be YYYY-MM' });
      if (amount === null) errors.push({ row: rowNumber, message: 'amount must be integer' });

      if (driverId && workMonth && amount !== null) {
        validRows.push({ driverId, workMonth, payoutMonth, amount, row: rowNumber });
      }
    }

    const driverIds = Array.from(new Set(validRows.map((row) => row.driverId)));
    const drivers = await prisma.drivers.findMany({
      where: {
        OR: [
          { id: { in: driverIds } },
          { external_id: { in: driverIds } }
        ]
      }
    });
    const driverMap = new Map<string, (typeof drivers)[number]>();
    for (const driver of drivers) {
      driverMap.set(driver.id, driver);
      if (driver.external_id) driverMap.set(driver.external_id, driver);
    }
    const companyIds = Array.from(new Set(drivers.map((driver) => driver.company_id)));
    const companies = await prisma.companies.findMany({
      where: { id: { in: companyIds } },
      select: { id: true, payout_offset_months: true }
    });
    const companyMap = new Map(companies.map((company) => [company.id, company]));

    const inserted: number[] = [];
    for (const row of validRows) {
      const driver = driverMap.get(row.driverId);
      if (!driver) {
        errors.push({ row: row.row, message: 'driver not found' });
        continue;
      }

      const offset = companyMap.get(driver.company_id)?.payout_offset_months ?? 2;
      const payoutMonthFinal = row.payoutMonth ?? addMonths(row.workMonth, offset);

      await prisma.earnings.create({
        data: {
          driver_id: driver.id,
          company_id: driver.company_id,
          work_month: row.workMonth,
          payout_month: payoutMonthFinal,
          amount: row.amount,
          status: 'confirmed'
        }
      });
      inserted.push(row.row);
    }

    const errorCsv = errors.length
      ? toCsv(['row', 'message'], errors.map((err) => [String(err.row), err.message]))
      : null;

    return {
      status: errors.length > 0 ? 207 : 200,
      body: {
        imported: inserted.length,
        errors,
        errorCsv
      }
    };
  };
};
