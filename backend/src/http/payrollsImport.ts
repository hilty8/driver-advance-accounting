import { prisma } from '../repositories/prisma/client';
import { parseCsv, parseDate, parseMonth, parsePositiveBigInt, validateRowLength, CsvError, toCsv } from './csv';
import { computePayoutDate } from '../domain/dates';
import { isBusinessDay } from '../domain/holidays';
import { jsonError } from './errors';

const REQUIRED_HEADER_DATE = ['driver_external_id', 'payout_date', 'gross_salary_amount'];
const REQUIRED_HEADER_MONTH = ['driver_external_id', 'payout_month', 'gross_salary_amount'];

type HandlerInput = {
  body: string;
};

type HandlerResponse = {
  status: number;
  body: unknown;
};

export const createPayrollsImportHandler = () => {
  return async (input: HandlerInput): Promise<HandlerResponse> => {
    const { header, rows } = parseCsv(input.body);
    if (header.length === 0) {
      return { status: 400, body: jsonError('empty csv') };
    }

    const normalizedHeader = header.map((h) => h.toLowerCase());
    const headerKey = normalizedHeader.join(',');
    const isDateHeader = headerKey === REQUIRED_HEADER_DATE.join(',');
    const isMonthHeader = headerKey === REQUIRED_HEADER_MONTH.join(',');
    if (!isDateHeader && !isMonthHeader) {
      return { status: 400, body: jsonError('invalid header', { expected: [REQUIRED_HEADER_DATE, REQUIRED_HEADER_MONTH], actual: header }) };
    }

    const errors: CsvError[] = [];
    const validRows: { driverId: string; payoutDate: Date; amount: bigint; row: number }[] = [];

    for (let i = 0; i < rows.length; i += 1) {
      const rowNumber = i + 2;
      const row = rows[i];
      if (!validateRowLength(row, header, rowNumber, errors)) continue;

      const driverId = row[0];
      const payoutDate = isDateHeader ? parseDate(row[1]) : null;
      const payoutMonth = isMonthHeader ? parseMonth(row[1]) : null;
      const amount = parsePositiveBigInt(row[2]);

      if (!driverId) errors.push({ row: rowNumber, message: 'driver_external_id is required' });
      if (isDateHeader && !payoutDate) errors.push({ row: rowNumber, message: 'payout_date must be YYYY-MM-DD' });
      if (isMonthHeader && !payoutMonth) errors.push({ row: rowNumber, message: 'payout_month must be YYYY-MM' });
      if (amount === null) errors.push({ row: rowNumber, message: 'gross_salary_amount must be integer' });

      if (driverId && amount !== null && (payoutDate || payoutMonth)) {
        validRows.push({ driverId, payoutDate: payoutDate ?? payoutMonth!, amount, row: rowNumber });
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

    const inserted: number[] = [];
    for (const row of validRows) {
      const driver = driverMap.get(row.driverId);
      if (!driver) {
        errors.push({ row: row.row, message: 'driver not found' });
        continue;
      }

      let payoutDate: Date | null = null;
      if (isDateHeader) {
        payoutDate = row.payoutDate as Date;
      } else {
        const company = await prisma.companies.findUnique({ where: { id: driver.company_id } });
        if (!company) {
          errors.push({ row: row.row, message: 'company not found' });
          continue;
        }
        payoutDate = computePayoutDate(
          row.payoutDate as Date,
          company.payout_day ?? null,
          company.payout_day_is_month_end,
          isBusinessDay
        );
        if (!payoutDate) {
          errors.push({ row: row.row, message: 'payout_day setting is missing' });
          continue;
        }
      }

      await prisma.payrolls.create({
        data: {
          driver_id: driver.id,
          company_id: driver.company_id,
          payout_date: payoutDate,
          gross_salary_amount: row.amount,
          advance_collection_amount: 0n,
          status: 'planned'
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
