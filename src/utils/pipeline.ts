import type { Milestone, OpportunitySummary, PipelineSummary } from '../types/dashboard';

const commitment = (value?: string) => (value ?? '').trim().toLowerCase();

export interface OpportunityPipelineInput {
  opportunityId: string;
  vertical: string;
  customerCommitment: string;
  consumedRecurring: number;
}

const uniqueMilestones = (milestones: Milestone[]) => Array.from(new Map(milestones.filter((item) => item.milestoneId).map((item) => [item.milestoneId, item])).values());

export const calculateCommittedPipeline = (milestones: Milestone[]): number => uniqueMilestones(milestones).filter((item) => ['committed', 'commited'].includes(commitment(item.customerCommitment))).reduce((sum, item) => sum + (item.estimatedMonthlyUsage ?? 0), 0);

export const calculateUncommittedPipeline = (milestones: Milestone[]): number => uniqueMilestones(milestones).filter((item) => ['uncommitted', 'uncommited'].includes(commitment(item.customerCommitment))).reduce((sum, item) => sum + (item.estimatedMonthlyUsage ?? 0), 0);

export const calculateCommittedOpportunityPipeline = (opportunities: OpportunityPipelineInput[]): number => opportunities.filter((item) => ['committed', 'commited'].includes(commitment(item.customerCommitment))).reduce((sum, item) => sum + item.consumedRecurring, 0);

export const calculateUncommittedOpportunityPipeline = (opportunities: OpportunityPipelineInput[]): number => opportunities.filter((item) => ['uncommitted', 'uncommited'].includes(commitment(item.customerCommitment))).reduce((sum, item) => sum + item.consumedRecurring, 0);

export const groupMilestonesByOpportunity = (milestones: Milestone[]): Map<string, Milestone[]> => {
  const groups = new Map<string, Milestone[]>();
  uniqueMilestones(milestones).forEach((item) => {
    const key = item.opportunityId || item.opportunityName;
    groups.set(key, [...(groups.get(key) ?? []), item]);
  });
  return groups;
};

const statusRank: Record<string, number> = { Blocked: 5, 'At Risk': 4, Planning: 3, 'On Track': 2, Completed: 1 };

export const getOpportunityOverallStatus = (milestones: Milestone[]): string => uniqueMilestones(milestones).reduce((current, item) => (statusRank[item.status] ?? 0) > (statusRank[current] ?? 0) ? item.status : current, 'Completed');

export const getNextMilestone = (milestones: Milestone[]): Milestone | undefined => uniqueMilestones(milestones).filter((item) => item.estimatedDate).sort((left, right) => new Date(left.estimatedDate as string).getTime() - new Date(right.estimatedDate as string).getTime())[0];

export const calculateOpportunitySummary = (opportunity: { opportunityId: string; opportunityName: string; vertical: string; stage: string; ownership: string; owner: string; handoff: string; risk: string; nextAction: string; opportunityUrl?: string }, milestones: Milestone[]): OpportunitySummary => {
  const related = uniqueMilestones(milestones.filter((item) => item.opportunityId === opportunity.opportunityId || item.opportunityName === opportunity.opportunityName));
  const committedValue = calculateCommittedPipeline(related);
  const uncommittedValue = calculateUncommittedPipeline(related);
  const next = getNextMilestone(related);
  const commitments = new Set(related.map((item) => commitment(item.customerCommitment)));
  const customerCommitment = commitments.size > 1 ? 'Mixed' : related[0]?.customerCommitment ?? '';
  return { ...opportunity, opportunityUrl: opportunity.opportunityUrl ?? '', customerCommitment, milestoneCount: related.length, committedValue, uncommittedValue, pipelineTotal: committedValue + uncommittedValue, nextMilestone: next?.title ?? '', nextMilestoneDate: next?.estimatedDateText ?? '', overallStatus: getOpportunityOverallStatus(related), milestones: related };
};

export const summarizePipeline = (milestones: Milestone[]): PipelineSummary => {
  const unique = uniqueMilestones(milestones);
  const committed = calculateCommittedPipeline(unique);
  const uncommitted = calculateUncommittedPipeline(unique);
  const byCommitment = (value: string) => unique.filter((item) => commitment(item.customerCommitment) === value);
  return {
    committedValue: committed,
    uncommittedValue: uncommitted,
    totalValue: committed + uncommitted,
    committedMilestones: byCommitment('committed').length + byCommitment('commited').length,
    uncommittedMilestones: byCommitment('uncommitted').length + byCommitment('uncommited').length,
    committedOpportunities: new Set(byCommitment('committed').concat(byCommitment('commited')).map((item) => item.opportunityId || item.opportunityName)).size,
    uncommittedOpportunities: new Set(byCommitment('uncommitted').concat(byCommitment('uncommited')).map((item) => item.opportunityId || item.opportunityName)).size,
    byVertical: Object.fromEntries(Array.from(new Set(unique.map((item) => item.vertical || 'Not informed'))).map((name) => [name, unique.filter((item) => (item.vertical || 'Not informed') === name).reduce((sum, item) => sum + (item.estimatedMonthlyUsage ?? 0), 0)])),
    byStatus: Object.fromEntries(Array.from(new Set(unique.map((item) => item.status))).map((status) => [status, unique.filter((item) => item.status === status).length])),
  };
};
