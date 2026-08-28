import { describe, expect, it } from 'vitest';
import { normalizeStatus, toNumber, cleanText } from './utils/strings';
import { calculateCurrentMonthProjection, calculateProjectedBaseline, calculateProjectedBaselineByMonth, normalizeDate, isWithinDays, isPastDue } from './utils/date';
import { calculateCommittedPipeline, calculateUncommittedPipeline, getOpportunityOverallStatus } from './utils/pipeline';

describe('Excel parsing helpers', () => {
  it('reads headers and normalizes status', () => {
    expect(normalizeStatus('On Track')).toBe('On Track');
    expect(normalizeStatus('Blocked')).toBe('Blocked');
    expect(normalizeStatus('')).toBe('Unknown');
  });

  it('normalizes dates from different formats', () => {
    const iso = normalizeDate('2024-10-15');
    expect(iso).toBeDefined();
    expect(new Date(iso as string).getFullYear()).toBe(2024);
  });

  it('treats empty cells safely', () => {
    expect(cleanText('')).toBe('Não informado');
    expect(toNumber('')).toBe(0);
  });

  it('detects overdue and near-term milestones', () => {
    const now = new Date();
    const overdueDate = new Date(now.getTime() - 86400000).toISOString();
    const soonDate = new Date(now.getTime() + 1000 * 60 * 60 * 24 * 5).toISOString();

    expect(isPastDue(overdueDate)).toBe(true);
    expect(isWithinDays(soonDate, 30)).toBe(true);
  });

  it('calculates pipeline by unique milestone and commitment', () => {
    const milestones = [
      { milestoneId: '1', opportunityId: 'op-1', opportunityName: 'A', title: 'A', status: 'On Track', owner: '', currentOwnership: '', customerCommitment: 'Committed', estimatedMonthlyUsage: 100 },
      { milestoneId: '1', opportunityId: 'op-1', opportunityName: 'A', title: 'A', status: 'On Track', owner: '', currentOwnership: '', customerCommitment: 'Committed', estimatedMonthlyUsage: 100 },
      { milestoneId: '2', opportunityId: 'op-1', opportunityName: 'A', title: 'B', status: 'At Risk', owner: '', currentOwnership: '', customerCommitment: 'Uncommitted', estimatedMonthlyUsage: 50 },
    ] as any;
    expect(calculateCommittedPipeline(milestones)).toBe(100);
    expect(calculateUncommittedPipeline(milestones)).toBe(50);
    expect(getOpportunityOverallStatus(milestones)).toBe('At Risk');
  });

  it('projects the fiscal-year baseline from the previous month daily value', () => {
    const dailyConsumption = [
      { month: 'Jul 26', value: 100 },
      { month: 'Aug 26', value: 120 },
    ];

    expect(calculateProjectedBaseline(dailyConsumption, new Date(2026, 7, 15))).toBe(34_020);
    expect(calculateProjectedBaselineByMonth(dailyConsumption, new Date(2026, 7, 15))[1]).toEqual({ month: 'Sep 26', value: 3_000 });
    expect(calculateProjectedBaselineByMonth(dailyConsumption, new Date(2026, 7, 15)).at(-1)).toEqual({ month: 'Jun 27', value: 3_000 });
    expect(calculateProjectedBaseline([], new Date(2026, 7, 15))).toBe(0);
  });

  it('projects the month in progress from its own daily value', () => {
    const dailyConsumption = [
      { month: 'Jul 26', value: 100 },
      { month: 'Aug 26', value: 120 },
    ];
    const currentDate = new Date(2026, 7, 15);

    const currentMonth = calculateCurrentMonthProjection(dailyConsumption, currentDate);
    expect(currentMonth).toEqual({ month: 'Aug 26', value: 3_720 });

    // The Monthly Consumption row must show exactly what Daily MoM projects.
    expect(calculateProjectedBaselineByMonth(dailyConsumption, currentDate)[0]).toEqual(currentMonth);
  });

  it('falls back to the previous month when the current one has no daily value', () => {
    const dailyConsumption = [{ month: 'Jul 26', value: 100 }];
    const currentDate = new Date(2026, 7, 15);

    expect(calculateCurrentMonthProjection(dailyConsumption, currentDate)).toBeUndefined();
    expect(calculateProjectedBaselineByMonth(dailyConsumption, currentDate)[0]).toEqual({ month: 'Aug 26', value: 3_100 });
  });
});
