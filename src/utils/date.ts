export const formatDate = (value?: string | null): string => {
  if (!value) return 'Not informed';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const normalizeDate = (value: unknown): string | undefined => {
  if (value == null || value === '') return undefined;
  if (typeof value === 'number') {
    const date = new Date(Math.round((value - 25569) * 86400 * 1000));
    return !Number.isNaN(date.getTime()) ? date.toISOString() : undefined;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const iso = new Date(trimmed);
    if (!Number.isNaN(iso.getTime())) return iso.toISOString();
    const brazilianDate = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
    if (brazilianDate) {
      const [, day, month, year] = brazilianDate;
      const fullYear = year.length === 2 ? 2000 + Number(year) : Number(year);
      const date = new Date(Date.UTC(fullYear, Number(month) - 1, Number(day)));
      return !Number.isNaN(date.getTime()) ? date.toISOString() : undefined;
    }
    const fallback = new Date(trimmed.replace('/', '-'));
    if (!Number.isNaN(fallback.getTime())) return fallback.toISOString();
    return trimmed;
  }
  return undefined;
};

export const isWithinDays = (dateValue?: string, days = 30): boolean => {
  if (!dateValue) return false;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const maxMs = days * 24 * 60 * 60 * 1000;
  return diff >= 0 && diff <= maxMs;
};

export const isPastDue = (dateValue?: string): boolean => {
  if (!dateValue) return false;
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return false;
  return date.getTime() < Date.now();
};

const monthLabel = (year: number, month: number): string =>
  new Date(Date.UTC(year, month, 1)).toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });

const daysInMonth = (year: number, month: number): number =>
  (Date.UTC(year, month + 1, 1) - Date.UTC(year, month, 1)) / 86400000;

/**
 * Run-rate projection for the month in progress, using its own Average Daily.
 *
 * Shared by the Monthly Consumption and Daily MoM tables so both always agree.
 */
export const calculateCurrentMonthProjection = (
  dailyConsumption: Array<{ month: string; value: number }>,
  currentDate = new Date(),
): { month: string; value: number } | undefined => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const label = monthLabel(year, month);
  const daily = dailyConsumption.find((item) => item.month === label)?.value ?? 0;
  if (daily <= 0) return undefined;
  return { month: label, value: daily * daysInMonth(year, month) };
};

export const calculateProjectedBaselineByMonth = (dailyConsumption: Array<{ month: string; value: number }>, currentDate = new Date()): Array<{ month: string; value: number }> => {
  const previousMonth = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const previousMonthLabel = previousMonth.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });
  const previousMonthDaily = dailyConsumption.find((item) => item.month === previousMonthLabel)?.value ?? 0;
  // Right after a month closes there is no previous-month daily yet, so the last one on record carries the run-rate.
  const baselineDaily = previousMonthDaily > 0
    ? previousMonthDaily
    : (dailyConsumption.filter((item) => item.value > 0).pop()?.value ?? 0);
  if (baselineDaily <= 0) return [];

  const currentMonthProjection = calculateCurrentMonthProjection(dailyConsumption, currentDate);
  const fiscalYearEnd = currentDate.getMonth() <= 5 ? currentDate.getFullYear() : currentDate.getFullYear() + 1;
  const projections: Array<{ month: string; value: number }> = [];
  for (let year = currentDate.getFullYear(), month = currentDate.getMonth(); year < fiscalYearEnd || month <= 5; month += 1) {
    if (month === 12) {
      month = 0;
      year += 1;
    }
    const label = monthLabel(year, month);
    const value = label === currentMonthProjection?.month
      ? currentMonthProjection.value
      : baselineDaily * daysInMonth(year, month);
    projections.push({ month: label, value });
  }
  return projections;
};

export const calculateProjectedBaseline = (dailyConsumption: Array<{ month: string; value: number }>, currentDate = new Date()): number => calculateProjectedBaselineByMonth(dailyConsumption, currentDate).reduce((sum, item) => sum + item.value, 0);
