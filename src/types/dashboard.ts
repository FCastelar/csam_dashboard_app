export type Status = 'On Track' | 'Planning' | 'At Risk' | 'Blocked' | 'Completed' | 'Not Started' | 'Unknown';

export interface Initiative {
  initiativeId: string;
  name: string;
  vertical: string;
  status: string;
  owner: string;
  opportunityIds: string[];
  lastUpdated: string;
}

export interface Opportunity {
  opportunityId: string;
  name: string;
  stage: string;
  vertical: string;
  status: string;
  committed: boolean;
  customerCommitment: string;
  monthlyUsage: number;
  ownership: string;
  handoff: string;
  nextMilestone?: string;
  risk?: string;
  milestones: Milestone[];
  lastUpdated: string;
}

export interface Milestone {
  milestoneId: string;
  milestoneUrl?: string;
  opportunityId: string;
  opportunityName: string;
  vertical?: string;
  title: string;
  status: Status;
  owner: string;
  currentOwnership: string;
  estimatedDate?: string;
  estimatedDateText?: string;
  workload?: number;
  customerCommitment?: string;
  estimatedMonthlyUsage?: number;
  category?: string;
  handoffCondition?: string;
  nextAction?: string;
  nextReviewDate?: string;
  risk?: string;
  lastUpdated?: string;
  isCommitted?: boolean;
}

export interface AccountOverview {
  general: Record<string, string>;
  accountTeam: Array<Record<string, string>>;
  contracts: Array<Record<string, string>>;
  successPrograms: Array<Record<string, string>>;
  stakeholders: Array<Record<string, string>>;
  priorities: Array<Record<string, string>>;
}

export interface CsuPackageProject {
  name: string;
  dispatch: string;
  dispatchUrl: string;
  endDate: string;
  csa: string;
  planned: number;
  hours: number;
  stakeholder: string;
  status: string;
}

export interface CsuPackage {
  name: string;
  description: string;
  soldHours: number;
  hoursConsumed: number;
  hoursPlanned: number;
  projects: CsuPackageProject[];
}

export interface CsuVerticalSummary {
  name: string;
  activeProjects: number;
  opportunityCount: number;
  hoursConsumed: number;
  hoursPlanned: number;
}

export interface OpportunitySummary {
  opportunityId: string;
  opportunityUrl: string;
  opportunityName: string;
  vertical: string;
  stage: string;
  ownership: string;
  owner: string;
  handoff: string;
  risk: string;
  nextAction: string;
  customerCommitment: string;
  milestoneCount: number;
  committedValue: number;
  uncommittedValue: number;
  pipelineTotal: number;
  nextMilestone: string;
  nextMilestoneDate: string;
  overallStatus: string;
  milestones: Milestone[];
}

export interface PipelineSummary {
  committedValue: number;
  uncommittedValue: number;
  totalValue: number;
  committedMilestones: number;
  uncommittedMilestones: number;
  committedOpportunities: number;
  uncommittedOpportunities: number;
  byVertical: Record<string, number>;
  byStatus: Record<string, number>;
}

export interface ConsumptionMonth {
  month: string;
  value: number;
}

export interface DailyConsumption {
  month: string;
  value: number;
}

export interface MaccComparison {
  month: string;
  expectedMonthly: number;
  actualAcr: number;
  difference: number;
}

export interface Decision {
  id: string;
  title: string;
  decisionDate?: string;
  owner: string;
  status: string;
  relatedOpportunityId?: string;
}

export interface Risk {
  id: string;
  title: string;
  opportunityId?: string;
  severity: string;
  status: string;
  owner: string;
}

export interface MeetingHistory {
  id: string;
  sessionDate: string;
  summary: string;
  actions: string[];
  decisions: string[];
  risks: string[];
  milestonesReviewed: string[];
  successStories: string[];
  indicators?: Record<string, number | string>;
}

export interface DashboardSummary {
  lastUpdated: string;
  lastSessionDate: string;
  executiveSummary: string;
  /** Themed notes from the most recent Executive_Summary row. */
  executiveHighlights: {
    asks: string;
    risks: string;
    opportunities: string;
    pending: string;
  };
  kpis: {
    openInitiatives: number;
    activeProjects: number;
    activeOpportunities: number;
    milestonesTracked: number;
    milestonesCommitted: number;
    milestonesUncommitted: number;
    milestonesAtRiskOrBlocked: number;
    hoursConsumed: number;
    hoursPlanned: number;
  };
  opportunities: Opportunity[];
  milestones: Milestone[];
  decisions: Decision[];
  risks: Risk[];
  history: MeetingHistory[];
  accountOverview: AccountOverview;
  totalHoursSold: number;
  csuPackages: CsuPackage[];
  csuVerticalSummary: CsuVerticalSummary[];
  atuOpportunities: OpportunitySummary[];
  pipelineSummary: PipelineSummary;
  consumption: ConsumptionMonth[];  dailyConsumption: DailyConsumption[];
  /** Month still receiving ACR, so its totals are not comparable yet. */
  openConsumptionMonth: string;
  /** "Last update" stamp the Consumption sheet carries above its header. */
  consumptionLastUpdated: string;
  maccComparison: MaccComparison[];
  maccTotal: number;
}
