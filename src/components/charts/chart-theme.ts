/*
 * Shared chart chrome. Colours are read from the same CSS variables the rest of
 * the UI uses, so charts follow the accent picker and the light/dark switch
 * without any component re-reading a palette.
 */
export const chartColors = {
  accent: 'rgb(var(--color-accent))',
  ink: 'rgb(var(--color-ink))',
  midGray: 'rgb(var(--color-mid-gray))',
  hairline: 'rgb(var(--color-hairline))',
  paper: 'rgb(var(--color-paper))',
  onTrack: 'rgb(var(--color-status-on-track))',
  planning: 'rgb(var(--color-status-planning))',
};

export const axisProps = {
  tick: { fill: chartColors.midGray, fontSize: 12 },
  tickLine: false,
  axisLine: { stroke: chartColors.hairline },
};

/** Compact currency so axis ticks stay legible at chart scale. */
export const formatAxisCurrency = (value: number) => {
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(Math.round(value));
};

export const tooltipStyles = {
  contentStyle: {
    background: chartColors.paper,
    border: `1px solid ${chartColors.hairline}`,
    borderRadius: 10,
    fontSize: 12,
    color: chartColors.ink,
    boxShadow: '0 10px 24px -6px rgb(0 0 0 / 0.18)',
  },
  labelStyle: { color: chartColors.midGray, marginBottom: 4 },
  itemStyle: { color: chartColors.ink },
};
