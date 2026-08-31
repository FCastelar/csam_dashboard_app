/** Joins class names, dropping the falsy branches that conditional styling produces. */
export const cn = (...values: Array<string | number | false | null | undefined>) =>
  values.filter((value): value is string => typeof value === 'string' && value.length > 0).join(' ');
