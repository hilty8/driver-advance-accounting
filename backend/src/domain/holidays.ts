export const isWeekend = (date: Date): boolean => {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
};

export const isJapaneseHoliday = (date: Date): boolean => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const holidays = require('japanese-holidays');
    return Boolean(holidays.isHoliday(date));
  } catch (error) {
    return false;
  }
};

export const isBusinessDay = (date: Date): boolean => {
  if (isWeekend(date)) return false;
  return !isJapaneseHoliday(date);
};
