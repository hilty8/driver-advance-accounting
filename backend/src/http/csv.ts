import { toDateOnly } from '../domain/dates';

type CsvParseResult = {
  header: string[];
  rows: string[][];
};

type CsvError = {
  row: number;
  message: string;
};

export const parseCsv = (text: string): CsvParseResult => {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  if (lines.length === 0) {
    return { header: [], rows: [] };
  }

  const header = lines[0].split(',').map((v) => v.trim());
  const rows = lines.slice(1).map((line) => line.split(',').map((v) => v.trim()));
  return { header, rows };
};

export const toCsv = (header: string[], rows: string[][]): string => {
  const lines = [header.join(',')];
  for (const row of rows) {
    lines.push(row.map((value) => `${value}`).join(','));
  }
  return `${lines.join('\n')}\n`;
};

export const parsePositiveBigInt = (value: string): bigint | null => {
  if (!/^[0-9]+$/.test(value)) return null;
  return BigInt(value);
};

export const parseMonth = (value: string): Date | null => {
  const match = value.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return new Date(Date.UTC(year, month - 1, 1));
};

export const parseDate = (value: string): Date | null => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return null;
  }
  return toDateOnly(date);
};

export const validateRowLength = (row: string[], header: string[], rowIndex: number, errors: CsvError[]) => {
  if (row.length !== header.length) {
    errors.push({ row: rowIndex, message: `column count mismatch: expected ${header.length} got ${row.length}` });
    return false;
  }
  return true;
};

export type { CsvError };
