export type AccentColor =
  | 'blue'
  | 'green'
  | 'red'
  | 'orange'
  | 'purple'
  | 'brown'
  | 'lightBlue'
  | 'darkBlue';

type AccentDefinition = {
  label: string;
  /** RGB triple used on the light theme, where the accent sits on white. */
  light: string;
  /** Lighter triple for the dark theme, where the accent sits on near-black. */
  dark: string;
};

/*
 * The accent picker survives the redesign, but every hue was pulled toward the
 * neutral base: enough chroma to identify the choice, never enough to fight the
 * monochromatic system.
 */
export const accentColors: Record<AccentColor, AccentDefinition> = {
  blue: { label: 'Blue', light: '59 111 168', dark: '138 176 219' },
  green: { label: 'Green', light: '61 106 74', dark: '132 184 148' },
  red: { label: 'Red', light: '178 42 46', dark: '240 130 134' },
  orange: { label: 'Orange', light: '154 106 42', dark: '216 170 106' },
  purple: { label: 'Purple', light: '106 92 128', dark: '176 162 200' },
  brown: { label: 'Brown', light: '107 83 68', dark: '190 162 145' },
  lightBlue: { label: 'Light blue', light: '74 124 153', dark: '145 190 214' },
  darkBlue: { label: 'Dark Blue', light: '44 62 91', dark: '150 170 200' },
};

export const accentTriple = (accent: AccentColor, isDark: boolean) =>
  isDark ? accentColors[accent].dark : accentColors[accent].light;

/*
 * Status colours resolve through CSS variables so a theme switch repaints them
 * without any component re-reading a palette.
 */
const statusVariables: Record<string, string> = {
  'On Track': '--color-status-on-track',
  Planning: '--color-status-planning',
  'At Risk': '--color-status-at-risk',
  Blocked: '--color-status-blocked',
  Completed: '--color-status-completed',
  'Not Started': '--color-status-not-started',
  Unknown: '--color-status-unknown',
};

export const statusVariable = (status: string) => statusVariables[status] ?? '--color-status-unknown';

/** Solid colour for icons, text and small graphic marks. */
export const statusColor = (status: string) => `rgb(var(${statusVariable(status)}))`;

export const statusPillStyle = (status: string) => ({
  color: statusColor(status),
  backgroundColor: `rgb(var(${statusVariable(status)}) / 0.12)`,
});

/** Fiscal quarters borrow the status hues so the palette stays closed. */
const quarterVariables: Record<string, string> = {
  Q1: '--color-status-planning',
  Q2: '--color-status-on-track',
  Q3: '--color-status-at-risk',
  Q4: '--color-status-blocked',
};

export const quarterPillStyle = (quarter: string) => {
  const variable = quarterVariables[quarter] ?? '--color-status-unknown';
  return {
    color: `rgb(var(${variable}))`,
    backgroundColor: `rgb(var(${variable}) / 0.12)`,
  };
};

export type Tone = 'positive' | 'negative' | 'neutral';

export const toneColor = (tone?: Tone) => {
  if (tone === 'positive') return 'rgb(var(--color-status-on-track))';
  if (tone === 'negative') return 'rgb(var(--color-ember))';
  return undefined;
};
