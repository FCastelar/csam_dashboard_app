export const cleanText = (value: unknown): string => {
  if (value == null) return 'Não informado';
  const asString = String(value).trim();
  if (!asString) return 'Não informado';
  return asString.replace(/\s+/g, ' ').trim();
};

export const toNumber = (value: unknown): number => {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const sanitized = value.replace(/[^0-9,.-]/g, '').replace(',', '.');
    const parsed = Number(sanitized);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

export const normalizeStatus = (value: unknown): string => {
  if (value === null || value === undefined) return 'Unknown';

  const rawText = String(value).trim();
  if (!rawText || rawText.toLowerCase() === 'n/a') return 'Unknown';

  const text = cleanText(value);
  const normalized = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  if (normalized === 'nao informado' || normalized === 'n/a') return 'Unknown';
  if (normalized.includes('on track')) return 'On Track';
  if (normalized.includes('planning')) return 'Planning';
  if (normalized.includes('at risk')) return 'At Risk';
  if (normalized.includes('blocked')) return 'Blocked';
  if (normalized.includes('completed')) return 'Completed';
  if (normalized.includes('not started')) return 'Not Started';

  return text.charAt(0).toUpperCase() + text.slice(1);
};
