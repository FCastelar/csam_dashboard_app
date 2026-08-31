import { lazy, Suspense, type ComponentProps } from 'react';

/*
 * Recharts is ~400kB of the bundle and the default view of every panel is the
 * table, so the whole charting layer is code-split and only fetched when someone
 * actually switches to a chart.
 */
const Charts = {
  Consumption: lazy(() => import('./index').then((m) => ({ default: m.ConsumptionChart }))),
  Daily: lazy(() => import('./index').then((m) => ({ default: m.DailyChart }))),
  Macc: lazy(() => import('./index').then((m) => ({ default: m.MaccChart }))),
};

function ChartFallback() {
  return (
    <div className="mt-4 flex h-[300px] w-full items-center justify-center text-body text-mid-gray">
      Loading chart…
    </div>
  );
}

export function ConsumptionChartLazy(props: ComponentProps<typeof Charts.Consumption>) {
  return (
    <Suspense fallback={<ChartFallback />}>
      <Charts.Consumption {...props} />
    </Suspense>
  );
}

export function DailyChartLazy(props: ComponentProps<typeof Charts.Daily>) {
  return (
    <Suspense fallback={<ChartFallback />}>
      <Charts.Daily {...props} />
    </Suspense>
  );
}

export function MaccChartLazy(props: ComponentProps<typeof Charts.Macc>) {
  return (
    <Suspense fallback={<ChartFallback />}>
      <Charts.Macc {...props} />
    </Suspense>
  );
}
