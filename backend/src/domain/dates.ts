export const toDateOnly = (date: Date): Date => {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  return new Date(Date.UTC(year, month, day));
};

export const monthStart = (date: Date): Date => {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  return new Date(Date.UTC(year, month, 1));
};

export const monthEnd = (date: Date): Date => {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  return new Date(Date.UTC(year, month + 1, 0));
};

export const addMonths = (date: Date, months: number): Date => {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth();
  return new Date(Date.UTC(year, month + months, 1));
};

export const adjustToPreviousBusinessDay = (date: Date, isBusinessDay: (d: Date) => boolean): Date => {
  let current = new Date(date.getTime());
  while (!isBusinessDay(current)) {
    current = new Date(Date.UTC(current.getUTCFullYear(), current.getUTCMonth(), current.getUTCDate() - 1));
  }
  return current;
};

export const computePayoutDate = (
  payoutMonthStart: Date,
  payoutDay: number | null | undefined,
  payoutDayIsMonthEnd: boolean,
  isBusinessDay: (d: Date) => boolean
): Date | null => {
  const base = payoutDayIsMonthEnd ? monthEnd(payoutMonthStart) : payoutDay ? new Date(Date.UTC(
    payoutMonthStart.getUTCFullYear(),
    payoutMonthStart.getUTCMonth(),
    payoutDay
  )) : null;
  if (!base) return null;
  return adjustToPreviousBusinessDay(base, isBusinessDay);
};
