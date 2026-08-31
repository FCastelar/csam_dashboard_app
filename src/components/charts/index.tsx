import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { axisProps, chartColors, formatAxisCurrency, tooltipStyles } from './chart-theme';

/** Fixed height keeps charts from collapsing inside flex and print contexts. */
function ChartFrame({ children }: { children: React.ReactElement }) {
  return (
    <div className="mt-4 h-[300px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

const legendStyle = { fontSize: 12, color: chartColors.midGray };

/** Recharts widens tooltip values to string|number|array, so narrow before formatting. */
const makeFormatter = (formatValue: (value: number) => string) =>
  (value: unknown, name: unknown): [string, string] => [
    typeof value === 'number' ? formatValue(value) : '-',
    String(name ?? ''),
  ];

type ConsumptionPoint = { month: string; actual: number | null; projected: number | null };

/** Actual runs solid, projection dashed — the visual grammar of "not yet real". */
export function ConsumptionChart({
  data,
  formatValue,
}: {
  data: ConsumptionPoint[];
  formatValue: (value: number) => string;
}) {
  return (
    <ChartFrame>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
        <CartesianGrid stroke={chartColors.hairline} vertical={false} />
        <XAxis dataKey="month" {...axisProps} />
        <YAxis tickFormatter={formatAxisCurrency} width={56} {...axisProps} />
        <Tooltip {...tooltipStyles} formatter={makeFormatter(formatValue)} />
        <Legend wrapperStyle={legendStyle} />
        <Line
          type="monotone"
          dataKey="actual"
          name="Actual"
          stroke={chartColors.accent}
          strokeWidth={2}
          dot={{ r: 2.5, strokeWidth: 0, fill: chartColors.accent }}
          activeDot={{ r: 4 }}
          connectNulls
        />
        <Line
          type="monotone"
          dataKey="projected"
          name="Projected"
          stroke={chartColors.midGray}
          strokeWidth={1.5}
          strokeDasharray="4 4"
          dot={false}
          connectNulls
        />
      </LineChart>
    </ChartFrame>
  );
}

type DailyPoint = { month: string; value: number | null };

export function DailyChart({
  data,
  formatValue,
}: {
  data: DailyPoint[];
  formatValue: (value: number) => string;
}) {
  return (
    <ChartFrame>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
        <CartesianGrid stroke={chartColors.hairline} vertical={false} />
        <XAxis dataKey="month" {...axisProps} />
        <YAxis tickFormatter={formatAxisCurrency} width={56} {...axisProps} />
        <Tooltip {...tooltipStyles} formatter={makeFormatter(formatValue)} />
        <Line
          type="monotone"
          dataKey="value"
          name="Average daily"
          stroke={chartColors.accent}
          strokeWidth={2}
          dot={{ r: 2.5, strokeWidth: 0, fill: chartColors.accent }}
          activeDot={{ r: 4 }}
          connectNulls
        />
      </LineChart>
    </ChartFrame>
  );
}

type MaccPoint = { month: string; expected: number | null; actual: number | null };

/** Grouped bars: the comparison is per month, not a trend. */
export function MaccChart({
  data,
  formatValue,
}: {
  data: MaccPoint[];
  formatValue: (value: number) => string;
}) {
  return (
    <ChartFrame>
      <BarChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
        <CartesianGrid stroke={chartColors.hairline} vertical={false} />
        <XAxis dataKey="month" {...axisProps} />
        <YAxis tickFormatter={formatAxisCurrency} width={56} {...axisProps} />
        <Tooltip {...tooltipStyles} cursor={{ fill: 'rgb(var(--color-accent) / 0.06)' }} formatter={makeFormatter(formatValue)} />
        <Legend wrapperStyle={legendStyle} />
        <Bar dataKey="expected" name="Expected MACC" fill={chartColors.midGray} radius={[4, 4, 0, 0]} maxBarSize={22} />
        <Bar dataKey="actual" name="Current ACR" fill={chartColors.accent} radius={[4, 4, 0, 0]} maxBarSize={22} />
      </BarChart>
    </ChartFrame>
  );
}
