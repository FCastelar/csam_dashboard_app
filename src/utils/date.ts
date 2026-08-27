export const formatDate = (value?: string | null): string => {
  if (!value) return 'Não informado';
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

export const calculateProjectedBaselineByMonth = (dailyConsumption: Array<{ month: string; value: number }>, currentDate = new Date()): Array<{ month: string; value: number }> => {
  const previousMonth = new Date(Date.UTC(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const previousMonthLabel = previousMonth.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });
  const previousMonthDaily = dailyConsumption.find((item) => item.month === previousMonthLabel)?.value ?? 0;
  if (previousMonthDaily <= 0) return [];

  const fiscalYearEnd = currentDate.getMonth() <= 5 ? currentDate.getFullYear() : currentDate.getFullYear() + 1;
  const projections: Array<{ month: string; value: number }> = [];
  for (let year = currentDate.getFullYear(), month = currentDate.getMonth(); year < fiscalYearEnd || month <= 5; month += 1) {
    if (month === 12) {
      month = 0;
      year += 1;
    }
    const monthStart = Date.UTC(year, month, 1);
    const daysInMonth = (Date.UTC(year, month + 1, 1) - monthStart) / 86400000;
    const monthLabel = new Date(monthStart).toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });
    projections.push({ month: monthLabel, value: previousMonthDaily * daysInMonth });
  }
  return projections;
};

export const calculateProjectedBaseline = (dailyConsumption: Array<{ month: string; value: number }>, currentDate = new Date()): number => calculateProjectedBaselineByMonth(dailyConsumption, currentDate).reduce((sum, item) => sum + item.value, 0);
