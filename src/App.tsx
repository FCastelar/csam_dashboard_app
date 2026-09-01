import { Fragment, useEffect, useMemo, useState } from 'react';
import { Activity, Briefcase, CalendarClock, CheckCircle2, ChevronDown, ChevronRight, CircleHelp, Clock, FileDown, FolderKanban, FolderSync, LayoutDashboard, Moon, Presentation, RefreshCw, Search, Shield, Sun, TrendingUp, UserRound } from 'lucide-react';
import type { DashboardSummary } from './types/dashboard';
import { calculateCurrentMonthProjection, calculateProjectedBaselineByMonth } from './utils/date';
import { useDashboardSource } from './hooks/use-dashboard-source';
import ConnectScreen from './components/ConnectScreen';
import { ConsumptionChartLazy, DailyChartLazy, MaccChartLazy } from './components/charts/lazy';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  CardTitle,
  ChartPanel,
  EmptyRow,
  FieldShell,
  IconButton,
  NestedCard,
  SearchField,
  SegmentedNav,
  Select,
  StatBlock,
  TBody,
  TD,
  TH,
  THead,
  TR,
  Table,
  TableScroll,
  TintedBadge,
  cn,
} from './components/ui';
import {
  accentColors,
  accentTriple,
  quarterPillStyle,
  statusColor,
  statusPillStyle,
  toneColor,
  type AccentColor,
} from './theme/tokens';

const fiscalQuarter = (date: Date) => {
  const month = date.getMonth();
  if (month >= 6 && month <= 8) return 'Q1';
  if (month >= 9 && month <= 11) return 'Q2';
  if (month <= 2) return 'Q3';
  return 'Q4';
};

// The workbook spells the value both ways.
const isCommitted = (value?: string) => ['committed', 'commited'].includes((value ?? '').trim().toLowerCase());

// Rejecting ? and & keeps a workbook cell from smuggling extra headers into the mailto link.
const isEmailAddress = (value: string) => /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(value);

const byName = (left: { name: string }, right: { name: string }) =>
  (left.name ?? '').localeCompare(right.name ?? '', undefined, { sensitivity: 'base' });

type Language = 'pt' | 'en' | 'es';
type DashboardView = 'overview' | 'csu' | 'atu-stu';
type AtuSortKey = 'vertical' | 'opportunityName' | 'opportunityId' | 'stage' | 'customerCommitment' | 'owner' | 'pipelineTotal' | 'handoff' | 'risk';

type CsuMilestoneSortKey = 'title' | 'milestoneId' | 'opportunityName' | 'owner' | 'estimatedDate' | 'estimatedMonthlyUsage' | 'customerCommitment' | 'status';

const FormulaHelp = ({ label, formula }: { label: string; formula: string }) => (
  <span className="group relative inline-flex">
    <button type="button" aria-label={`${label} formula: ${formula}`} className="inline-flex h-4 w-4 items-center justify-center text-mid-gray transition-colors hover:text-ink focus:text-ink focus:outline-none">
      <CircleHelp size={14} strokeWidth={1.5} aria-hidden="true" />
    </button>
    <span role="tooltip" className="pointer-events-none invisible absolute right-0 top-6 z-20 w-60 rounded-nested border border-hairline bg-paper px-3 py-2 text-left text-caption font-normal normal-case tracking-normal leading-relaxed text-ink opacity-0 shadow-popover transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
      {formula}
    </span>
  </span>
);

/** Column header that doubles as the sort control. */
const SortHeader = ({ label, active, direction, onClick }: { label: string; active: boolean; direction: 'asc' | 'desc'; onClick: () => void }) => (
  <button type="button" onClick={onClick} aria-label={`Sort by ${label}`} className="inline-flex items-center gap-1 font-medium uppercase tracking-[0.6px] text-mid-gray transition-colors hover:text-ink">
    {label}
    <span aria-hidden="true" className={active ? 'text-ink' : 'text-mid-gray/60'}>{active ? (direction === 'asc' ? '↑' : '↓') : '↕'}</span>
  </button>
);

const translations = {
  pt: {
    accountView: 'Account Executive View', dark: 'Dark', light: 'Light', refresh: 'Refresh', refreshing: 'Refreshing...', lastUpdate: 'Last update', lastSession: 'Last session', notInformed: 'Not informed', excelUpdated: 'Excel atualizado', changeSource: 'Trocar origem', executiveSummary: 'Executive summary', verticalView: 'View by Vertical', projects: 'Projetos', opportunities: 'Oportunidades', consumedHours: 'Horas consumidas', plannedHours: 'Horas planejadas', clearFilters: 'Limpar filtros', searchOpportunity: 'Pesquisar oportunidade', vertical: 'Vertical', stage: 'Opportunity Stage', commitment: 'Customer Commitment', owner: 'Owner', handoff: 'Handoff para CSU', opportunityId: 'Opportunity ID', consumedRecurring: 'Consumed Recurring', risk: 'Risco / Bloqueio', milestone: 'Milestones', milestones: 'Milestones', searchMilestone: 'Pesquisar milestone', category: 'Categoria', estimatedDate: 'Estimated Date', monthlyUsage: 'Est. Monthly Usage', milestoneStatus: 'Milestone Status', commitmentValue: 'Commitment', atRisk: 'Milestones at risk ou blocked', activeMilestones: 'Milestones ativos', activeOpportunities: 'Oportunidades ativas', committedMilestones: 'Milestones committed', uncommittedMilestones: 'Milestones uncommitted', activeProjects: 'Projetos em execução', period: 'Período', next30: 'Próximos 30 dias', portuguese: 'Português', english: 'English', spanish: 'Español', status: 'Status', search: 'Pesquisar', upcoming: 'Próximos 30 dias',
  },
  en: {
    accountView: 'Account Executive View', dark: 'Dark', light: 'Light', refresh: 'Refresh', refreshing: 'Refreshing...', lastUpdate: 'Last update', lastSession: 'Last session', notInformed: 'Not informed', excelUpdated: 'Excel updated', changeSource: 'Change source', executiveSummary: 'Executive summary', verticalView: 'View by vertical', projects: 'Projects', opportunities: 'Opportunities', consumedHours: 'Consumed hours', plannedHours: 'Planned hours', clearFilters: 'Clear filters', searchOpportunity: 'Search opportunity', vertical: 'Vertical', stage: 'Opportunity Stage', commitment: 'Customer Commitment', owner: 'Owner', handoff: 'Handoff to CSU', opportunityId: 'Opportunity ID', consumedRecurring: 'Consumed Recurring', risk: 'Risk / Blocker', milestone: 'Milestones', milestones: 'Milestones', searchMilestone: 'Search milestone', category: 'Category', estimatedDate: 'Estimated Date', monthlyUsage: 'Est. Monthly Usage', milestoneStatus: 'Milestone Status', commitmentValue: 'Commitment', atRisk: 'Milestones at risk or blocked', activeMilestones: 'Active milestones', activeOpportunities: 'Active opportunities', committedMilestones: 'Committed milestones', uncommittedMilestones: 'Uncommitted milestones', activeProjects: 'Projects in execution', period: 'Period', next30: 'Next 30 days', portuguese: 'Português', english: 'English', spanish: 'Español', status: 'Status', search: 'Search', upcoming: 'Next 30 days',
  },
  es: {
    accountView: 'Vista del ejecutivo de cuenta', dark: 'Oscuro', light: 'Claro', refresh: 'Actualizar', refreshing: 'Actualizando...', lastUpdate: 'Última actualización', lastSession: 'Última sesión', notInformed: 'No informado', excelUpdated: 'Excel actualizado', changeSource: 'Cambiar origen', executiveSummary: 'Resumen ejecutivo', verticalView: 'Vista por vertical', projects: 'Proyectos', opportunities: 'Oportunidades', consumedHours: 'Horas consumidas', plannedHours: 'Horas planificadas', clearFilters: 'Limpiar filtros', searchOpportunity: 'Buscar oportunidad', vertical: 'Vertical', stage: 'Etapa de oportunidad', commitment: 'Compromiso del cliente', owner: 'Responsable', handoff: 'Traspaso a CSU', opportunityId: 'ID de oportunidad', consumedRecurring: 'Consumo recurrente', risk: 'Riesgo / bloqueo', milestone: 'Hitos', milestones: 'Hitos', searchMilestone: 'Buscar hito', category: 'Categoría', estimatedDate: 'Fecha estimada', monthlyUsage: 'Uso mensual estimado', milestoneStatus: 'Estado del hito', commitmentValue: 'Compromiso', atRisk: 'Hitos en riesgo o bloqueados', activeMilestones: 'Hitos activos', activeOpportunities: 'Oportunidades activas', committedMilestones: 'Hitos comprometidos', uncommittedMilestones: 'Hitos no comprometidos', activeProjects: 'Proyectos en ejecución', period: 'Período', next30: 'Próximos 30 días', portuguese: 'Português', english: 'English', spanish: 'Español', status: 'Estado', search: 'Buscar', upcoming: 'Próximos 30 días',
  },
} as const;

type DashboardProps = {
  data: DashboardSummary;
  accountFiles: string[];
  selectedAccount: string;
  onSelectAccount: (file: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  sourceLabel: string;
  onDisconnect: () => void;
};

function Dashboard({
  data,
  accountFiles,
  selectedAccount,
  onSelectAccount,
  onRefresh,
  isRefreshing,
  sourceLabel,
  onDisconnect,
}: DashboardProps) {
  const [search, setSearch] = useState('');
  const [verticalFilter, setVerticalFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [stageFilter, setStageFilter] = useState('all');
  const [commitmentFilter, setCommitmentFilter] = useState('all');
  const [ownershipFilter, setOwnershipFilter] = useState('all');
  const [handoffFilter, setHandoffFilter] = useState('all');
  const [ownerFilter, setOwnerFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState('all');
  const [milestoneSearch, setMilestoneSearch] = useState('');
  const [milestoneStatusFilter, setMilestoneStatusFilter] = useState('all');
  const [milestoneCommitmentFilter, setMilestoneCommitmentFilter] = useState('all');
  const [milestoneOwnerFilter, setMilestoneOwnerFilter] = useState('all');
  const [milestoneCategoryFilter, setMilestoneCategoryFilter] = useState('all');
  const [milestoneHandoffFilter, setMilestoneHandoffFilter] = useState('all');
  const [refreshStamp, setRefreshStamp] = useState(Date.now());
  const [isDark, setIsDark] = useState(false);
  const [accentColor, setAccentColor] = useState<AccentColor>('blue');
  const [language, setLanguage] = useState<Language>('en');
  const [view, setView] = useState<DashboardView>('overview');
  const [expandedPackages, setExpandedPackages] = useState<Record<string, boolean>>({});
  const [csuPackageFilter, setCsuPackageFilter] = useState('all');
  const [csuStatusFilter, setCsuStatusFilter] = useState('all');
  const [csuCsaFilter, setCsuCsaFilter] = useState('all');
  const [areCsuMilestonesExpanded, setAreCsuMilestonesExpanded] = useState(false);
  const [areAtuOpportunitiesExpanded, setAreAtuOpportunitiesExpanded] = useState(false);
  const [csuMilestoneSort, setCsuMilestoneSort] = useState<{ key: CsuMilestoneSortKey; direction: 'asc' | 'desc' }>({ key: 'estimatedDate', direction: 'asc' });
  const [atuVerticalFilter, setAtuVerticalFilter] = useState('all');
  const [atuStageFilter, setAtuStageFilter] = useState('all');
  const [atuCommitmentFilter, setAtuCommitmentFilter] = useState('all');
  const [atuStatusFilter, setAtuStatusFilter] = useState('all');
  const [atuOwnershipFilter, setAtuOwnershipFilter] = useState('all');
  const [atuOwnerFilter, setAtuOwnerFilter] = useState('all');
  const [atuPeriodFilter, setAtuPeriodFilter] = useState('all');
  const [expandedAtuOpportunities, setExpandedAtuOpportunities] = useState<Record<string, boolean>>({});
  const [atuSort, setAtuSort] = useState<{ key: AtuSortKey; direction: 'asc' | 'desc' }>({ key: 'vertical', direction: 'asc' });
  const [mode, setMode] = useState<'rob' | 'presentation'>('rob');
  const t = translations[language];

  const accountLabel = (file: string) => file.replace(/_Account_Executive_View\.xlsx$/i, '').replace(/\.xlsx$/i, '').replace(/[_-]+/g, ' ');
  const accountName = selectedAccount ? selectedAccount.replace(/_Account_Executive_View\.xlsx$/i, '').replace(/\.xlsx$/i, '') : 'CAF';

  const accountColorKey = (file: string) => `caf-dashboard-accent-${file}`;

  useEffect(() => {
    if (!selectedAccount) return;
    const savedColor = window.localStorage.getItem(accountColorKey(selectedAccount)) as AccentColor | null;
    if (savedColor && savedColor in accentColors) setAccentColor(savedColor);
  }, [selectedAccount]);

  // Drives `color-scheme`, which is what themes native scrollbars and select popups.
  useEffect(() => {
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
    return () => {
      delete document.documentElement.dataset.theme;
    };
  }, [isDark]);

  const handleAccentColorChange = (color: AccentColor) => {
    setAccentColor(color);
    if (selectedAccount) window.localStorage.setItem(accountColorKey(selectedAccount), color);
  };

  const handleRefresh = () => {
    onRefresh();
    setRefreshStamp(Date.now());
  };

  const handleExportPdf = () => {
    window.print();
  };

  const verticalOptions = ['all', ...new Set((data.csuVerticalSummary ?? []).map((vertical) => vertical.name))];
  const statusOptions = ['all', 'On Track', 'Planning', 'At Risk', 'Blocked', 'Completed'];
  const commitmentOptions = ['all', ...new Set(data.opportunities.map((opportunity) => opportunity.customerCommitment).filter((value) => value && value !== 'Not informed'))];
  const stageOptions = ['all', ...new Set(data.opportunities.map((opportunity) => opportunity.stage).filter((value) => value && value !== 'Not informed'))];
  const ownerOptions = ['all', ...new Set(data.opportunities.map((opportunity) => opportunity.ownership).filter((value) => value && value !== 'Not informed'))];
  const handoffOptions = ['all', ...new Set(data.opportunities.map((opportunity) => opportunity.handoff).filter((value): value is string => Boolean(value && value !== 'Not informed')))];
  const milestoneStatusOptions = ['all', ...new Set(data.milestones.map((milestone) => milestone.status).filter(Boolean))];
  const milestoneCommitmentOptions = ['all', ...new Set(data.milestones.map((milestone) => milestone.customerCommitment).filter((value): value is string => Boolean(value)))];
  const milestoneOwnerOptions = ['all', ...new Set(data.milestones.map((milestone) => milestone.owner).filter(Boolean))];
  const milestoneCategoryOptions = ['all', ...new Set(data.milestones.map((milestone) => milestone.category).filter((value): value is string => Boolean(value)))];
  const milestoneHandoffOptions = ['all', ...new Set(data.milestones.map((milestone) => milestone.handoffCondition).filter((value): value is string => Boolean(value)))];
  const csuPackageOptions = ['all', ...new Set(data.csuPackages.map((pkg) => pkg.name).filter(Boolean))];
  const csuStatusOptions = ['all', ...new Set(data.csuPackages.flatMap((pkg) => pkg.projects.map((project) => project.status)).filter(Boolean))];
  const csuCsaOptions = ['all', ...new Set(data.csuPackages.flatMap((pkg) => pkg.projects.map((project) => project.csa)).filter(Boolean))];
  const atuVerticalOptions = ['all', ...new Set(data.atuOpportunities.map((opportunity) => opportunity.vertical).filter(Boolean))];
  const atuStageOptions = ['all', ...new Set(data.atuOpportunities.map((opportunity) => opportunity.stage).filter(Boolean))];
  const atuCommitmentOptions = ['all', ...new Set(data.atuOpportunities.map((opportunity) => opportunity.customerCommitment).filter(Boolean))];
  const atuStatusOptions = ['all', ...new Set(data.atuOpportunities.map((opportunity) => opportunity.overallStatus).filter(Boolean))];
  const atuOwnershipOptions = ['all', ...new Set(data.atuOpportunities.map((opportunity) => opportunity.ownership).filter(Boolean))];
  const atuOwnerOptions = ['all', ...new Set(data.atuOpportunities.map((opportunity) => opportunity.owner).filter(Boolean))];

  useEffect(() => {
    const timer = window.setInterval(() => setRefreshStamp(Date.now()), 15000);
    return () => window.clearInterval(timer);
  }, []);

  const filteredMilestones = useMemo(() => {
    const searchText = milestoneSearch.toLowerCase();
    return data.milestones.filter((item) => {
      const matchesSearch = !searchText || [item.title, item.opportunityName, item.opportunityId, item.milestoneId].some((field) => field?.toLowerCase().includes(searchText));
      const matchesStatus = milestoneStatusFilter === 'all' || item.status === milestoneStatusFilter;
      const matchesCommitment = milestoneCommitmentFilter === 'all' || item.customerCommitment === milestoneCommitmentFilter;
      const matchesOwner = milestoneOwnerFilter === 'all' || item.owner === milestoneOwnerFilter;
      const matchesCategory = milestoneCategoryFilter === 'all' || item.category === milestoneCategoryFilter;
      const matchesHandoff = milestoneHandoffFilter === 'all' || item.handoffCondition === milestoneHandoffFilter;
      return matchesSearch && matchesStatus && matchesCommitment && matchesOwner && matchesCategory && matchesHandoff;
    });
  }, [milestoneSearch, milestoneStatusFilter, milestoneCommitmentFilter, milestoneOwnerFilter, milestoneCategoryFilter, milestoneHandoffFilter, data.milestones]);

  const filteredOpportunities = useMemo(() => {
    const searchText = search.toLowerCase();
    return data.opportunities.filter((opportunity) => {
      const matchesSearch = !searchText || [opportunity.name, opportunity.opportunityId, opportunity.stage, opportunity.vertical].some((field) => field?.toLowerCase().includes(searchText));
      const matchesVertical = verticalFilter === 'all' || opportunity.vertical === verticalFilter;
      const matchesStage = stageFilter === 'all' || opportunity.stage === stageFilter;
      const matchesCommitment = commitmentFilter === 'all' || opportunity.customerCommitment.toLowerCase() === commitmentFilter.toLowerCase();
      const matchesOwnership = ownershipFilter === 'all' || opportunity.ownership?.toLowerCase().includes(ownershipFilter.toLowerCase());
      const matchesHandoff = handoffFilter === 'all' || opportunity.handoff?.toLowerCase().includes(handoffFilter.toLowerCase());
      const matchesOwner = ownerFilter === 'all' || opportunity.ownership === ownerFilter;
      return matchesSearch && matchesVertical && matchesStage && matchesCommitment && matchesOwnership && matchesHandoff && matchesOwner;
    });
  }, [search, verticalFilter, stageFilter, commitmentFilter, ownershipFilter, handoffFilter, ownerFilter]);

  const filteredCsuPackages = useMemo(() => data.csuPackages
    .filter((pkg) => csuPackageFilter === 'all' || pkg.name === csuPackageFilter)
    .map((pkg) => ({
      ...pkg,
      projects: pkg.projects.filter((project) => (csuStatusFilter === 'all' || project.status === csuStatusFilter) && (csuCsaFilter === 'all' || project.csa === csuCsaFilter)),
    }))
    .filter((pkg) => (csuStatusFilter === 'all' && csuCsaFilter === 'all') || pkg.projects.length > 0),
  [data.csuPackages, csuPackageFilter, csuStatusFilter, csuCsaFilter]);

  // The calendar may already be in the next month while the last one is still open in the workbook.
  const referenceDate = useMemo(() => {
    const stamp = data.consumptionLastUpdated ? new Date(data.consumptionLastUpdated) : undefined;
    if (!stamp || Number.isNaN(stamp.getTime())) return new Date();
    return new Date(stamp.getUTCFullYear(), stamp.getUTCMonth(), stamp.getUTCDate());
  }, [data.consumptionLastUpdated]);

  const projectedConsumption = useMemo(() => {
    return calculateProjectedBaselineByMonth(data.dailyConsumption, referenceDate);
  }, [data.dailyConsumption, referenceDate, refreshStamp]);

  const projectedYearTotal = useMemo(() => data.consumption.reduce((sum, item) => {
    const projection = projectedConsumption.find((projected) => projected.month === item.month);
    return sum + (projection?.value ?? item.value);
  }, 0), [data.consumption, projectedConsumption]);

  const pbo = projectedYearTotal + data.pipelineSummary.committedValue;

  const openMonthIndex = data.consumption.findIndex((item) => item.month === data.openConsumptionMonth);

  const lastClosedMonth = useMemo(() => {
    const closedIndex = openMonthIndex > 0 ? openMonthIndex - 1 : -1;
    if (closedIndex < 0) return undefined;
    const closed = data.consumption[closedIndex];
    const previous = closedIndex > 0 ? data.consumption[closedIndex - 1] : undefined;
    const monthOverMonth = previous && previous.value > 0 ? ((closed.value - previous.value) / previous.value) * 100 : undefined;
    return { ...closed, monthOverMonth };
  }, [data.consumption, openMonthIndex]);

  const dailyMoM = useMemo(() => {
    const [previous, current] = data.dailyConsumption.filter((item) => item.value > 0).slice(-2);
    return previous && current && previous.value > 0 ? ((current.value - previous.value) / previous.value) * 100 : undefined;
  }, [data.dailyConsumption]);

  const currentMonthProjection = useMemo(() => calculateCurrentMonthProjection(data.dailyConsumption, referenceDate), [data.dailyConsumption, referenceDate]);

  const maccDifferenceTotal = useMemo(() => {
    // The month still being loaded has partial ACR, so it would show an artificial gap.
    const closedMonths = data.maccComparison.filter((item) => item.actualAcr > 0 && item.month !== data.openConsumptionMonth);
    if (!closedMonths.length) return undefined;
    return closedMonths.reduce((sum, item) => sum + item.difference, 0);
  }, [data.maccComparison, data.openConsumptionMonth]);

  const maccBurndown = useMemo(() => {
    const totalAcr = data.maccComparison.reduce((sum, item) => sum + item.actualAcr, 0);
    return data.maccTotal > 0 ? (totalAcr / data.maccTotal) * 100 : undefined;
  }, [data.maccComparison, data.maccTotal]);

  const currentCsuMilestones = useMemo(() => {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const quarterEndMonth = [8, 11, 2, 5][['Q1', 'Q2', 'Q3', 'Q4'].indexOf(fiscalQuarter(now))];
    const quarterEndYear = quarterEndMonth < now.getMonth() ? now.getFullYear() + 1 : now.getFullYear();
    const windowEnd = new Date(quarterEndYear, quarterEndMonth + 2, 0, 23, 59, 59, 999);

    return data.milestones
      .filter((milestone) => {
        if (!isCommitted(milestone.customerCommitment)) return false;
        if (!milestone.estimatedDate) return false;
        const estimatedDate = new Date(milestone.estimatedDate);
        return !Number.isNaN(estimatedDate.getTime()) && estimatedDate >= currentMonthStart && estimatedDate <= windowEnd;
      })
      .sort((left, right) => new Date(left.estimatedDate ?? 0).getTime() - new Date(right.estimatedDate ?? 0).getTime());
  }, [data.milestones, refreshStamp]);

  const visibleCsuMilestones = useMemo(() => [...currentCsuMilestones].sort((left, right) => {
    const leftValue = left[csuMilestoneSort.key];
    const rightValue = right[csuMilestoneSort.key];
    const comparison = typeof leftValue === 'number' && typeof rightValue === 'number'
      ? leftValue - rightValue
      : String(leftValue ?? '').localeCompare(String(rightValue ?? ''), undefined, { numeric: true, sensitivity: 'base' });
    return csuMilestoneSort.direction === 'asc' ? comparison : -comparison;
  }), [currentCsuMilestones, csuMilestoneSort]);

  const setCsuMilestoneSortKey = (key: CsuMilestoneSortKey) => setCsuMilestoneSort((current) => ({ key, direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc' }));

  const csuMilestoneTotals = useMemo(() => visibleCsuMilestones.reduce((totals, milestone) => ({
    estimatedMonthlyUsage: totals.estimatedMonthlyUsage + (milestone.estimatedMonthlyUsage ?? 0),
    onTrack: totals.onTrack + (milestone.status === 'On Track' ? 1 : 0),
    blocked: totals.blocked + (milestone.status === 'Blocked' ? 1 : 0),
  }), { estimatedMonthlyUsage: 0, onTrack: 0, blocked: 0 }), [visibleCsuMilestones]);

  const filteredAtuOpportunities = useMemo(() => data.atuOpportunities.filter((opportunity) => (atuVerticalFilter === 'all' || opportunity.vertical === atuVerticalFilter) && (atuStageFilter === 'all' || opportunity.stage === atuStageFilter) && (atuCommitmentFilter === 'all' || opportunity.customerCommitment === atuCommitmentFilter) && (atuStatusFilter === 'all' || opportunity.overallStatus === atuStatusFilter) && (atuOwnershipFilter === 'all' || opportunity.ownership === atuOwnershipFilter) && (atuOwnerFilter === 'all' || opportunity.owner === atuOwnerFilter) && (atuPeriodFilter === 'all' || (opportunity.nextMilestoneDate && new Date(opportunity.nextMilestoneDate).getTime() < Date.now() + 30 * 86400000))), [data.atuOpportunities, atuVerticalFilter, atuStageFilter, atuCommitmentFilter, atuStatusFilter, atuOwnershipFilter, atuOwnerFilter, atuPeriodFilter]);

  const sortedAtuOpportunities = useMemo(() => [...filteredAtuOpportunities].sort((left, right) => {
    const leftValue = left[atuSort.key];
    const rightValue = right[atuSort.key];
    const comparison = typeof leftValue === 'number' && typeof rightValue === 'number'
      ? leftValue - rightValue
      : String(leftValue ?? '').localeCompare(String(rightValue ?? ''), undefined, { numeric: true, sensitivity: 'base' });
    return atuSort.direction === 'asc' ? comparison : -comparison;
  }), [filteredAtuOpportunities, atuSort]);

  const setAtuSortKey = (key: AtuSortKey) => setAtuSort((current) => ({ key, direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc' }));

  const atuOpportunityTotals = useMemo(() => sortedAtuOpportunities.reduce((totals, opportunity) => ({
    pipelineTotal: totals.pipelineTotal + opportunity.pipelineTotal,
    committed: totals.committed + opportunity.committedValue,
    uncommitted: totals.uncommitted + opportunity.uncommittedValue,
  }), { pipelineTotal: 0, committed: 0, uncommitted: 0 }), [sortedAtuOpportunities]);

  const resetFilters = () => {
    setSearch('');
    setVerticalFilter('all');
    setStageFilter('all');
    setStatusFilter('all');
    setCommitmentFilter('all');
    setOwnershipFilter('all');
    setHandoffFilter('all');
    setOwnerFilter('all');
    setPeriodFilter('all');
    setMilestoneSearch('');
    setMilestoneStatusFilter('all');
    setMilestoneCommitmentFilter('all');
    setMilestoneOwnerFilter('all');
    setMilestoneCategoryFilter('all');
    setMilestoneHandoffFilter('all');
  };

  const summaryCards = useMemo(() => [
    { label: t.activeProjects, value: data.kpis.activeProjects, icon: FolderKanban },
    { label: t.activeOpportunities, value: data.kpis.activeOpportunities, icon: Briefcase },
    { label: t.activeMilestones, value: data.kpis.milestonesTracked, icon: CalendarClock },
    { label: t.committedMilestones, value: data.kpis.milestonesCommitted, icon: CheckCircle2 },
    { label: t.uncommittedMilestones, value: data.kpis.milestonesUncommitted, icon: Activity },
    { label: t.atRisk, value: data.kpis.milestonesAtRiskOrBlocked, icon: Shield },
    { label: t.consumedHours, value: `${data.kpis.hoursConsumed}h`, icon: TrendingUp },
    { label: t.plannedHours, value: `${data.kpis.hoursPlanned}h`, icon: UserRound },
  ], [data, t]);

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value || 0);

  const formatNumber = (value: number) => new Intl.NumberFormat('pt-BR').format(value || 0);

  const formatDecimal = (value: number) => value.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const formatPercent = (value?: number) => value === undefined
    ? '-'
    : `${value >= 0 ? '+' : ''}${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

  /*
   * Chart series mirror exactly what the tables render, so both views of a panel
   * always agree. Months with no reading yet become null so the line simply ends
   * instead of diving to zero and implying a collapse in consumption.
   */
  const consumptionSeries = useMemo(() => data.consumption.map((item) => {
    const projection = projectedConsumption.find((projected) => projected.month === item.month);
    return {
      month: item.month,
      actual: item.value > 0 ? item.value : null,
      projected: projection?.value ?? (item.value > 0 ? item.value : null),
    };
  }), [data.consumption, projectedConsumption]);

  const dailySeries = useMemo(
    () => data.dailyConsumption.map((item) => ({
      month: item.month,
      value: item.value > 0 ? item.value : null,
    })),
    [data.dailyConsumption],
  );

  const maccSeries = useMemo(() => data.maccComparison.map((item) => ({
    month: item.month,
    expected: item.actualAcr > 0 ? item.expectedMonthly : null,
    actual: item.actualAcr > 0 ? item.actualAcr : null,
  })), [data.maccComparison]);

  /** Ordered as a pitch: where we are, where we land, what is in the funnel, how delivery is going. */
  const presentationGroups: Array<{
    title: string;
    caption?: string;
    cards: Array<{ label: string; value: string; hint?: string; tone?: 'positive' | 'negative' }>;
  }> = [
    {
      title: '1. Current Results',
      caption: data.consumptionLastUpdated
        ? `Consumption updated on ${new Date(data.consumptionLastUpdated).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}`
        : undefined,
      cards: [
        {
          label: lastClosedMonth ? `Last Month Close (${lastClosedMonth.month})` : 'Last Month Close',
          value: lastClosedMonth ? formatCurrency(lastClosedMonth.value) : '-',
          hint: lastClosedMonth?.monthOverMonth === undefined ? undefined : `MoM ${formatPercent(lastClosedMonth.monthOverMonth)}`,
        },
        {
          label: currentMonthProjection ? `Projected Close (${currentMonthProjection.month})` : 'Projected Close',
          value: currentMonthProjection ? formatCurrency(currentMonthProjection.value) : '-',
        },
        { label: 'Daily MoM%', value: formatPercent(dailyMoM), tone: dailyMoM === undefined ? undefined : dailyMoM >= 0 ? 'positive' : 'negative' },
        {
          label: 'MACC to ACR Difference',
          value: maccDifferenceTotal === undefined ? '-' : `${maccDifferenceTotal >= 0 ? '+' : ''}${formatCurrency(maccDifferenceTotal)}`,
          tone: maccDifferenceTotal === undefined ? undefined : maccDifferenceTotal >= 0 ? 'positive' : 'negative',
        },
      ],
    },
    {
      title: '2. Fiscal Year Projection',
      cards: [
        { label: 'Azure ACR Projected', value: formatCurrency(projectedYearTotal) },
        { label: 'PBO', value: formatCurrency(pbo) },
      ],
    },
    {
      title: '3. Pipeline',
      cards: [
        { label: 'Committed Pipeline', value: formatCurrency(data.pipelineSummary.committedValue) },
        { label: 'Uncommitted Pipeline', value: formatCurrency(data.pipelineSummary.uncommittedValue) },
        { label: 'Total Pipeline', value: formatCurrency(data.pipelineSummary.committedValue + data.pipelineSummary.uncommittedValue) },
      ],
    },
    {
      title: '4. Milestone Execution',
      cards: [
        { label: 'Active Milestones', value: formatNumber(data.kpis.milestonesTracked) },
        { label: 'Committed Milestones', value: formatNumber(data.kpis.milestonesCommitted) },
        { label: 'Uncommitted Milestones', value: formatNumber(data.kpis.milestonesUncommitted) },
        { label: 'At Risk or Blocked', value: formatNumber(data.kpis.milestonesAtRiskOrBlocked), tone: data.kpis.milestonesAtRiskOrBlocked > 0 ? 'negative' : 'positive' },
      ],
    },
  ];

  return (
    <div
      className="min-h-screen bg-canvas font-geist text-body text-ink"
      style={{ '--color-accent': accentTriple(accentColor, isDark) } as React.CSSProperties}
    >
      <div className="mx-auto max-w-page px-4 py-8 md:px-6 md:py-10">
        {/* The masthead sits on the canvas: typographic scale alone sets the hierarchy. */}
        <header className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 shrink-0">
            <p className="text-caption font-medium uppercase tracking-[0.6px] text-accent">
              Executive Account Dashboard
            </p>
            <h1 className="mt-3 text-heading font-semibold text-accent md:text-display">{accountName}</h1>
            <p className="mt-3 text-body text-mid-gray">
              {t.accountView} · TPID {data.accountOverview.general.TPID}
            </p>
          </div>

          <div data-print="hide" className="flex flex-1 flex-wrap items-center justify-end gap-2">
            {accountFiles.length > 0 && (
              <FieldShell label="Account">
                <select value={selectedAccount} onChange={(event) => onSelectAccount(event.target.value)} className="max-w-[200px] bg-transparent text-body text-ink outline-none">
                  {accountFiles.map((file) => <option key={file} value={file}>{accountLabel(file)}</option>)}
                </select>
              </FieldShell>
            )}
            <label className="flex h-9 items-center gap-2 rounded-pill bg-canvas px-3 transition-colors hover:bg-accent/10">
              <span className="sr-only">Accent color</span>
              <span className="h-2.5 w-2.5 shrink-0 rounded-pill bg-accent transition-transform duration-200" />
              <select value={accentColor} onChange={(event) => handleAccentColorChange(event.target.value as AccentColor)} className="max-w-[105px] bg-transparent text-body text-ink outline-none">
                {(Object.entries(accentColors) as [AccentColor, { label: string }][]).map(([key, option]) => <option key={key} value={key}>{option.label}</option>)}
              </select>
            </label>
            {/* Icon-only controls keep their label for assistive tech and tooltips. */}
            <IconButton
              variant="secondary"
              onClick={() => setIsDark((value) => !value)}
              aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              title={isDark ? t.light : t.dark}
            >
              {isDark ? <Sun size={16} strokeWidth={1.5} /> : <Moon size={16} strokeWidth={1.5} />}
            </IconButton>
            <IconButton
              variant="secondary"
              onClick={handleRefresh}
              disabled={isRefreshing}
              aria-label={isRefreshing ? t.refreshing : t.refresh}
              title={isRefreshing ? t.refreshing : t.refresh}
            >
              <RefreshCw size={16} strokeWidth={1.5} className={isRefreshing ? 'animate-spin' : ''} />
            </IconButton>
            <Button onClick={() => setMode((value) => (value === 'rob' ? 'presentation' : 'rob'))} className="min-w-[8rem]">
              {mode === 'rob'
                ? <><Presentation size={15} strokeWidth={1.5} /> Presentation</>
                : <><LayoutDashboard size={15} strokeWidth={1.5} /> ROB</>}
            </Button>
            {mode === 'presentation' && (
              <Button onClick={handleExportPdf} className="min-w-[7.5rem]">
                <FileDown size={15} strokeWidth={1.5} /> PDF Export
              </Button>
            )}
            <div className="flex w-full flex-wrap items-center justify-end gap-x-4 gap-y-2 text-caption tracking-normal text-mid-gray">
              <span>
                {t.lastUpdate}: <span className="text-ink">{new Date(data.lastUpdated).toLocaleString(language === 'pt' ? 'pt-BR' : language === 'es' ? 'es-ES' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
              </span>
              {/* Source swap is promoted to a real button: the label alone read as decoration. */}
              <span className="flex items-center gap-2">
                {/* The only control sized by its content: it grows with the file or folder name. */}
                <span className="max-w-[18rem] truncate text-ink" title={sourceLabel}>{sourceLabel || t.excelUpdated}</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onDisconnect}
                  title={`${t.changeSource} — pick another folder or file`}
                >
                  <FolderSync size={14} strokeWidth={1.5} /> {t.changeSource}
                </Button>
              </span>
            </div>
          </div>
        </header>

        {mode === 'rob' && (
          <div className="mt-8" data-print="hide">
            <SegmentedNav
              label="Dashboard views"
              value={view}
              onChange={setView}
              items={[['overview', 'Overview'], ['atu-stu', 'Consumption'], ['csu', 'CSU']] as const}
            />
          </div>
        )}

        {mode === 'rob' && view === 'overview' && <>
        <section className="mt-8">
          <Card>
            <CardHeader className="mb-4">
              <CardTitle>{t.executiveSummary}</CardTitle>
              <span className="text-body text-mid-gray">
                Last session: {data.lastSessionDate && data.lastSessionDate !== 'Not informed'
                  ? new Date(data.lastSessionDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
                  : 'Not informed'}
              </span>
            </CardHeader>
            <div className="space-y-4 text-body leading-relaxed text-mid-gray">
              <p className="whitespace-pre-line">{data.executiveSummary}</p>
            </div>
          </Card>
        </section>

        {false && <Card as="section" className="mt-8">
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>{t.opportunities}</CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <SearchField
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t.searchOpportunity}
                icon={<Search size={15} strokeWidth={1.5} />}
                className="w-64"
              />
              <Button onClick={resetFilters}>{t.clearFilters}</Button>
            </div>
          </div>

          <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <Select value={verticalFilter} onChange={(e) => setVerticalFilter(e.target.value)}><option value="all">{t.vertical}</option>{verticalOptions.filter(v => v !== 'all').map(v => <option key={v} value={v}>{v}</option>)}</Select>
            <Select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}><option value="all">{t.stage}</option>{stageOptions.filter(v => v !== 'all').map(v => <option key={v} value={v}>{v}</option>)}</Select>
            <Select value={commitmentFilter} onChange={(e) => setCommitmentFilter(e.target.value)}><option value="all">{t.commitment}</option>{commitmentOptions.filter(v => v !== 'all').map(v => <option key={v} value={v}>{v}</option>)}</Select>
            <Select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)}><option value="all">{t.owner}</option>{ownerOptions.filter(v => v !== 'all').map(v => <option key={v} value={v}>{v}</option>)}</Select>
            <Select value={handoffFilter} onChange={(e) => setHandoffFilter(e.target.value)}><option value="all">{t.handoff}</option>{handoffOptions.filter(v => v !== 'all').map(v => <option key={v} value={v}>{v}</option>)}</Select>
          </div>

          <TableScroll>
            <Table>
              <THead>
                <tr>
                  <TH>{t.vertical}</TH>
                  <TH>Opportunity</TH>
                  <TH>{t.opportunityId}</TH>
                  <TH>{t.stage}</TH>
                  <TH>{t.commitment}</TH>
                  <TH>{t.owner}</TH>
                  <TH>{t.consumedRecurring}</TH>
                  <TH>{t.handoff}</TH>
                  <TH>{t.risk}</TH>
                </tr>
              </THead>
              <TBody>
                {filteredOpportunities.map((opportunity, index) => (
                    <TR key={`${opportunity.opportunityId}-${index}`}>
                      <TD>{opportunity.vertical}</TD>
                      <TD className="font-medium">{opportunity.name}</TD>
                      <TD>{opportunity.opportunityId}</TD>
                      <TD>{opportunity.stage}</TD>
                      <TD>{opportunity.customerCommitment}</TD>
                      <TD>{opportunity.ownership}</TD>
                      <TD>{opportunity.monthlyUsage}</TD>
                      <TD>{opportunity.handoff}</TD>
                      <TD>{opportunity.risk}</TD>
                    </TR>
                ))}
              </TBody>
            </Table>
          </TableScroll>
        </Card>}

        {false && <section className="mt-8">
          <Card>
            <CardTitle>{t.milestones}</CardTitle>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <SearchField value={milestoneSearch} onChange={(e) => setMilestoneSearch(e.target.value)} placeholder={t.searchMilestone} />
              <Select value={milestoneStatusFilter} onChange={(e) => setMilestoneStatusFilter(e.target.value)}><option value="all">{t.milestoneStatus}</option>{milestoneStatusOptions.filter(v => v !== 'all').map(v => <option key={v} value={v}>{v}</option>)}</Select>
              <Select value={milestoneCommitmentFilter} onChange={(e) => setMilestoneCommitmentFilter(e.target.value)}><option value="all">{t.commitment}</option>{milestoneCommitmentOptions.filter(v => v !== 'all').map(v => <option key={v} value={v}>{v}</option>)}</Select>
              <Select value={milestoneOwnerFilter} onChange={(e) => setMilestoneOwnerFilter(e.target.value)}><option value="all">{t.owner}</option>{milestoneOwnerOptions.filter(v => v !== 'all').map(v => <option key={v} value={v}>{v}</option>)}</Select>
              <Select value={milestoneCategoryFilter} onChange={(e) => setMilestoneCategoryFilter(e.target.value)}><option value="all">{t.category}</option>{milestoneCategoryOptions.filter(v => v !== 'all').map(v => <option key={v} value={v}>{v}</option>)}</Select>
              <Select value={milestoneHandoffFilter} onChange={(e) => setMilestoneHandoffFilter(e.target.value)}><option value="all">{t.handoff}</option>{milestoneHandoffOptions.filter(v => v !== 'all').map(v => <option key={v} value={v}>{v}</option>)}</Select>
            </div>
            <div className="mt-4 space-y-3">
              {filteredMilestones.slice(0, 6).map((milestone) => (
                <NestedCard key={milestone.milestoneId}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="font-medium text-ink">{milestone.title}</div>
                      <div className="text-caption tracking-normal text-mid-gray">{milestone.opportunityName}</div>
                    </div>
                    <TintedBadge tint={statusPillStyle(milestone.status)}>{milestone.status}</TintedBadge>
                  </div>
                  <div className="mt-2 grid gap-2 text-caption tracking-normal text-mid-gray md:grid-cols-2">
                    <span>Owner: {milestone.owner}</span>
                    <span>Estimated Date: {milestone.estimatedDateText}</span>
                    <span>Est. Monthly Usage: {milestone.estimatedMonthlyUsage ?? ''}</span>
                    <span>Categoria: {milestone.category}</span>
                    <span>Handoff: {milestone.handoffCondition}</span>
                    <span>Commitment: {milestone.customerCommitment}</span>
                    <span>Risk / Blocker: {milestone.risk}</span>
                  </div>
                </NestedCard>
              ))}
            </div>
          </Card>

        </section>}

        <section className="mt-6">
          <Card>
            <CardTitle>Contracts</CardTitle>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{data.accountOverview.contracts.map((contract, index) => (
              <NestedCard key={`${contract['Tipo de Contrato']}-${index}`}>
                <strong className="font-medium text-ink">{[contract['Tipo de Contrato'], contract.Tecnologia].map((value) => (value ?? '').trim()).filter((value) => value && value !== '-').join(' | ')}</strong>
                <div className="text-mid-gray">{contract['Quantidade / Valor']} · {contract.Vigencia}</div>
                <div className="text-mid-gray">{contract.Status}</div>
              </NestedCard>
            ))}</div>
          </Card>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          {([
            ['Account Team', data.accountOverview.accountTeam.map((person) => ({
              name: person.Nome,
              role: person['Posicao / Role'],
              context: person.Organizacao,
              email: person.Email,
            })).sort(byName)],
            ['Customer Stakeholders', data.accountOverview.stakeholders.map((person) => ({
              name: person.Nome,
              role: person.Cargo,
              context: person.Contrato,
              email: person.Email,
            })).sort(byName)],
          ] as const).map(([title, people]) => (
            <Card key={title}>
              <CardHeader>
                <CardTitle>{title}</CardTitle>
                <Badge>{people.length} people</Badge>
              </CardHeader>
              <div className="mt-4 space-y-2">
                {people.map((person, index) => {
                  const email = (person.email ?? '').trim();
                  return (
                    <NestedCard key={`${person.name}-${index}`}>
                      <strong className="font-medium text-ink">{person.name}</strong>
                      <div className="text-mid-gray">{[person.role, person.context].filter((value) => value && value !== '-').join(' · ')}</div>
                      <div className="text-mid-gray">
                        {isEmailAddress(email)
                          ? <a href={`mailto:${email}`} className="underline decoration-dotted underline-offset-2 transition-colors hover:text-accent">{email}</a>
                          : email}
                      </div>
                    </NestedCard>
                  );
                })}
                {!people.length && <div className="text-body text-mid-gray">Not informed in the workbook.</div>}
              </div>
            </Card>
          ))}
        </section>
        </>}

        {mode === 'rob' && view === 'csu' && <section className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>CSU Packages</CardTitle>
              <div className="text-body"><span className="text-mid-gray">Total Hours Sold: </span><span className="font-medium text-ink">{formatNumber(data.totalHoursSold)}h</span></div>
            </CardHeader>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <Select value={csuPackageFilter} onChange={(e) => setCsuPackageFilter(e.target.value)}><option value="all">Package</option>{csuPackageOptions.filter((value) => value !== 'all').map((value) => <option key={value} value={value}>{value}</option>)}</Select>
              <Select value={csuStatusFilter} onChange={(e) => setCsuStatusFilter(e.target.value)}><option value="all">Status</option>{csuStatusOptions.filter((value) => value !== 'all').map((value) => <option key={value} value={value}>{value}</option>)}</Select>
              <Select value={csuCsaFilter} onChange={(e) => setCsuCsaFilter(e.target.value)}><option value="all">CSA</option>{csuCsaOptions.filter((value) => value !== 'all').map((value) => <option key={value} value={value}>{value}</option>)}</Select>
            </div>
            <TableScroll className="mt-4">
            <Table>
              <THead><tr>{['', 'Package', 'Description', 'Hours sold', 'Hours consumed', 'Hours balance', 'Hours planned'].map((header, index) => <TH key={header || index}>{header}</TH>)}</tr></THead>
              <TBody>
                {filteredCsuPackages.map((pkg) => {
                  const isExpanded = expandedPackages[pkg.name] ?? false;
                  const balance = pkg.soldHours - pkg.hoursConsumed;
                  return (
                    <Fragment key={pkg.name}>
                      <TR>
                        <TD>
                          <button
                            type="button"
                            onClick={() => setExpandedPackages((current) => ({ ...current, [pkg.name]: !isExpanded }))}
                            aria-expanded={isExpanded}
                            aria-label={`${isExpanded ? 'Recolher' : 'Expandir'} ${pkg.name}`}
                            className="inline-flex h-6 w-6 items-center justify-center rounded-pill bg-canvas text-ink transition-colors hover:bg-hairline"
                          >
                            {isExpanded ? '−' : '+'}
                          </button>
                        </TD>
                        <TD className="font-medium">{pkg.name}</TD>
                        <TD className="text-mid-gray">{pkg.description}</TD>
                        <TD className="tabular-nums">{pkg.soldHours ? `${formatNumber(pkg.soldHours)}h` : '-'}</TD>
                        <TD className="tabular-nums">{formatNumber(pkg.hoursConsumed)}h</TD>
                        <TD className="font-medium tabular-nums" style={{ color: toneColor(balance >= 0 ? 'positive' : 'negative') }}>{pkg.soldHours ? `${balance >= 0 ? '+' : ''}${formatNumber(balance)}h` : '-'}</TD>
                        <TD className="tabular-nums">{formatNumber(pkg.hoursPlanned)}h</TD>
                      </TR>
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="bg-surface-alt p-0">
                            <Table className="text-caption tracking-normal">
                              <THead><tr>{['Project', 'Dispatch', 'End Date', 'CSA', 'Planned', 'Hours', 'Stakeholder', 'Status'].map((header) => <TH key={header}>{header}</TH>)}</tr></THead>
                              <TBody>
                                {pkg.projects.map((project, index) => {
                                  const isDone = project.status.trim().toLowerCase() === 'done';
                                  const StatusIcon = isDone ? CheckCircle2 : Clock;
                                  return (
                                    <TR key={`${pkg.name}-${index}`} muted={isDone}>
                                      <TD className="text-caption tracking-normal">{project.name}</TD>
                                      <TD className="text-caption tracking-normal">{project.dispatchUrl ? <a href={project.dispatchUrl} target="_blank" rel="noreferrer" className="text-accent underline underline-offset-2 transition-colors hover:opacity-80">{project.dispatch}</a> : project.dispatch}</TD>
                                      <TD className="text-caption tracking-normal">{project.endDate}</TD>
                                      <TD className="text-caption tracking-normal">{project.csa}</TD>
                                      <TD className="text-caption tabular-nums tracking-normal">{formatNumber(project.planned)}</TD>
                                      <TD className="text-caption tabular-nums tracking-normal">{formatNumber(project.hours)}</TD>
                                      <TD className="text-caption tracking-normal">{project.stakeholder}</TD>
                                      <TD className="text-caption tracking-normal"><span className="inline-flex items-center gap-1" style={{ color: statusColor(isDone ? 'Completed' : 'At Risk') }}><StatusIcon size={14} strokeWidth={1.5} />{project.status}</span></TD>
                                    </TR>
                                  );
                                })}
                              </TBody>
                            </Table>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </TBody>
            </Table>
            </TableScroll>
          </Card>
          <Card>
            <CardTitle>Success Programs</CardTitle>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">{data.accountOverview.successPrograms.map((program, index) => <NestedCard key={`${program['Success Program']}-${index}`}><strong className="font-medium text-ink">{program['Success Program'] || 'Not informed'}</strong><div className="text-mid-gray">{program.Vertical} · {program.Atual} · {program.Unidade} · {program.Status}</div></NestedCard>)}</div>
          </Card>
          {/* Only the table scrolls sideways: on the panel the scrollbar would shrink the cards above. */}
          <Card>
            <CardHeader>
              <button
                type="button"
                onClick={() => setAreCsuMilestonesExpanded((value) => !value)}
                aria-expanded={areCsuMilestonesExpanded}
                className="inline-flex items-center gap-2 text-subheading font-semibold text-ink transition-colors hover:text-mid-gray"
              >
                {areCsuMilestonesExpanded ? <ChevronDown size={18} strokeWidth={1.5} /> : <ChevronRight size={18} strokeWidth={1.5} />}
                CSU Milestones
              </button>
              <Badge>{visibleCsuMilestones.length} committed milestones in period</Badge>
            </CardHeader>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <StatBlock label="Total Est. Monthly Usage" value={<span className="tabular-nums">{formatCurrency(csuMilestoneTotals.estimatedMonthlyUsage)}</span>} />
              <StatBlock label="On Track" value={<span className="tabular-nums" style={{ color: statusColor('On Track') }}>{csuMilestoneTotals.onTrack}</span>} />
              <StatBlock label="Blocked" value={<span className="tabular-nums" style={{ color: statusColor('Blocked') }}>{csuMilestoneTotals.blocked}</span>} />
            </div>
            {areCsuMilestonesExpanded && <TableScroll className="mt-4"><Table>
              <THead><tr>
                {([['Milestone', 'title'], ['Milestone ID', 'milestoneId'], ['Opportunity', 'opportunityName'], ['Owner', 'owner'], ['Estimated Date', 'estimatedDate'], ['Est. Monthly Usage', 'estimatedMonthlyUsage'], ['Customer Commitment', 'customerCommitment']] as const).map(([header, key]) => (
                  <TH key={key}>
                    <SortHeader label={header} active={csuMilestoneSort.key === key} direction={csuMilestoneSort.direction} onClick={() => setCsuMilestoneSortKey(key)} />
                  </TH>
                ))}
                <TH>Quarter</TH>
                <TH>
                  <SortHeader label="Status" active={csuMilestoneSort.key === 'status'} direction={csuMilestoneSort.direction} onClick={() => setCsuMilestoneSortKey('status')} />
                </TH>
              </tr></THead>
              <TBody>
                {visibleCsuMilestones.map((milestone, index) => {
                  const milestoneDate = new Date(milestone.estimatedDate ?? '');
                  const quarter = fiscalQuarter(milestoneDate);
                  return <TR key={`${milestone.milestoneId}-${index}`}>
                    <TD className="font-medium">{milestone.title}</TD>
                    <TD>{milestone.milestoneUrl ? <a href={milestone.milestoneUrl} target="_blank" rel="noreferrer" className="font-medium text-accent underline underline-offset-2 transition-colors hover:opacity-80">{milestone.milestoneId}</a> : milestone.milestoneId}</TD>
                    <TD>{milestone.opportunityName || '-'}</TD>
                    <TD>{milestone.owner}</TD>
                    <TD>{milestone.estimatedDateText}</TD>
                    <TD className="tabular-nums">{milestone.estimatedMonthlyUsage === undefined ? '-' : formatCurrency(milestone.estimatedMonthlyUsage)}</TD>
                    <TD>{milestone.customerCommitment ?? '-'}</TD>
                    <TD><TintedBadge tint={quarterPillStyle(quarter)}>{quarter}</TintedBadge></TD>
                    <TD><TintedBadge tint={statusPillStyle(milestone.status)}>{milestone.status}</TintedBadge></TD>
                  </TR>;
                })}
                {!visibleCsuMilestones.length && <EmptyRow colSpan={9}>No milestones in the selected period.</EmptyRow>}
              </TBody>
            </Table></TableScroll>}
          </Card>
        </section>}


        {mode === 'presentation' && <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            {presentationGroups.map((group) => (
              <Card key={group.title}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <CardTitle>{group.title}</CardTitle>
                  {group.caption && <span className="text-caption tracking-normal text-mid-gray">{group.caption}</span>}
                </div>
                {/* A shared 12-column grid: metrics split it evenly and line up across panels. */}
                <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-12">
                  {group.cards.map((card) => (
                    // Centering inside each equal column keeps the outer margins symmetric.
                    <div key={card.label} className="min-w-0 text-center" style={{ gridColumn: `span ${12 / group.cards.length}` }}>
                      {/* Fixed label height keeps every value on the same baseline. */}
                      <div className="flex min-h-[2rem] items-start justify-center text-caption font-medium uppercase tracking-[0.6px] text-mid-gray">{card.label}</div>
                      <div
                        className="mt-1 break-words text-heading-sm font-semibold tabular-nums text-ink"
                        style={{ color: toneColor(card.tone) }}
                      >
                        {card.value}
                      </div>
                      {card.hint && <div className="mt-1 text-caption tracking-normal text-mid-gray">{card.hint}</div>}
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>

          <Card>
            <CardTitle>5. Comments</CardTitle>
            <div className="mt-4 space-y-5">
              {([
                ['Opportunities', data.executiveHighlights.opportunities, statusColor('On Track')],
                ['Risks', data.executiveHighlights.risks, statusColor('Blocked')],
                ['Asks', data.executiveHighlights.asks, statusColor('Planning')],
                ['Pending', data.executiveHighlights.pending, statusColor('At Risk')],
              ] as const).map(([label, content, color]) => (
                <div key={label} className="border-l-2 pl-3" style={{ borderLeftColor: color }}>
                  <h3 className="text-caption font-medium uppercase tracking-[0.6px]" style={{ color }}>{label}</h3>
                  <p className="mt-1 whitespace-pre-line text-body text-mid-gray">{content}</p>
                </div>
              ))}
            </div>
          </Card>
        </section>}

        {mode === 'rob' && view === 'atu-stu' && <section className="mt-6 space-y-6">
          {/* Only the table scrolls sideways: on the panel the scrollbar would shrink the cards above. */}
          <Card>
            <CardHeader>
              <button
                type="button"
                onClick={() => setAreAtuOpportunitiesExpanded((value) => !value)}
                aria-expanded={areAtuOpportunitiesExpanded}
                className="inline-flex items-center gap-2 text-subheading font-semibold text-ink transition-colors hover:text-mid-gray"
              >
                {areAtuOpportunitiesExpanded ? <ChevronDown size={18} strokeWidth={1.5} /> : <ChevronRight size={18} strokeWidth={1.5} />}
                Opportunities
              </button>
              <Badge>{sortedAtuOpportunities.length} opportunities</Badge>
            </CardHeader>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {([
                ['Total Pipeline', 'Committed Pipeline + Uncommitted Pipeline for the listed opportunities.', atuOpportunityTotals.pipelineTotal, undefined],
                ['Committed Pipeline', 'Sum of Consumed Recurring for the listed opportunities marked as Committed.', atuOpportunityTotals.committed, statusColor('On Track')],
                ['Uncommitted Pipeline', 'Sum of Consumed Recurring for the listed opportunities not marked as Committed.', atuOpportunityTotals.uncommitted, statusColor('Planning')],
                ['Azure ACR Projected', "Closed-month Actuals + remaining fiscal-year projection. The month in progress uses its own Average Daily; later months use the last closed month's Average Daily. Each is multiplied by the calendar days in that month. Not affected by the filters below.", projectedYearTotal, undefined],
                ['PBO', 'Closed-month Actuals + Projected Baseline + Committed Pipeline. Equivalent to Azure ACR Projected + Committed Pipeline. Not affected by the filters below.', pbo, undefined],
              ] as const).map(([label, formula, value, color]) => (
                <StatBlock
                  key={label}
                  /* Fixed label height keeps every value on the same baseline when a title wraps. */
                  label={<span className="flex min-h-[2rem] items-start gap-1"><span className="min-w-0">{label}</span><span className="shrink-0"><FormulaHelp label={label} formula={formula} /></span></span>}
                  value={<span className="tabular-nums" style={color ? { color } : undefined}>{formatCurrency(value)}</span>}
                />
              ))}
            </div>
            {areAtuOpportunitiesExpanded && <TableScroll className="mt-4"><div className="grid min-w-[900px] gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Select value={atuVerticalFilter} onChange={(e) => setAtuVerticalFilter(e.target.value)}><option value="all">Vertical</option>{atuVerticalOptions.filter((value) => value !== 'all').map((value) => <option key={value}>{value}</option>)}</Select>
              <Select value={atuStageFilter} onChange={(e) => setAtuStageFilter(e.target.value)}><option value="all">Opportunity Stage</option>{atuStageOptions.filter((value) => value !== 'all').map((value) => <option key={value}>{value}</option>)}</Select>
              <Select value={atuCommitmentFilter} onChange={(e) => setAtuCommitmentFilter(e.target.value)}><option value="all">Customer Commitment</option>{atuCommitmentOptions.filter((value) => value !== 'all').map((value) => <option key={value}>{value}</option>)}</Select>
              <Select value={atuOwnerFilter} onChange={(e) => setAtuOwnerFilter(e.target.value)}><option value="all">Owner</option>{atuOwnerOptions.filter((value) => value !== 'all').map((value) => <option key={value}>{value}</option>)}</Select>
            </div>
            <Table className="mt-4">
              <THead><tr>{([['Vertical', 'vertical'], ['Opportunity', 'opportunityName'], ['Opportunity ID', 'opportunityId'], ['Opportunity Stage', 'stage'], ['Customer Commitment', 'customerCommitment'], ['Owner', 'owner'], ['Pipeline total', 'pipelineTotal'], ['Handoff to CSU', 'handoff'], ['Risk / Blocker', 'risk']] as const).map(([header, key]) => <TH key={key}><SortHeader label={header} active={atuSort.key === key} direction={atuSort.direction} onClick={() => setAtuSortKey(key)} /></TH>)}</tr></THead>
              <TBody>{sortedAtuOpportunities.map((opportunity) => <TR key={opportunity.opportunityId}><TD>{opportunity.vertical}</TD><TD className="font-medium">{opportunity.opportunityName}</TD><TD>{opportunity.opportunityUrl ? <a href={opportunity.opportunityUrl} target="_blank" rel="noreferrer" className="text-accent underline underline-offset-2 transition-colors hover:opacity-80">{opportunity.opportunityId}</a> : opportunity.opportunityId}</TD><TD>{opportunity.stage}</TD><TD>{opportunity.customerCommitment}</TD><TD>{opportunity.owner}</TD><TD className="tabular-nums">{formatCurrency(opportunity.pipelineTotal)}</TD><TD>{opportunity.handoff}</TD><TD>{opportunity.risk}</TD></TR>)}
              {!sortedAtuOpportunities.length && <EmptyRow colSpan={9}>No opportunities for the selected filters.</EmptyRow>}</TBody>
            </Table></TableScroll>}
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Monthly Consumption</CardTitle>
              <span className="text-body text-mid-gray">
                Last update: {data.consumptionLastUpdated ? new Date(data.consumptionLastUpdated).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}
              </span>
            </CardHeader>
            <ChartPanel
              className="mt-4"
              storageKey="monthly-consumption"
              chart={<ConsumptionChartLazy data={consumptionSeries} formatValue={formatCurrency} />}
              table={
                <TableScroll className="mt-4">
                <Table>
                  <THead><tr><TH className="sticky-col">Account</TH>{data.consumption.map((item) => <TH key={item.month}>{item.month}</TH>)}<TH>Total</TH></tr></THead>
                  <TBody>
                    <TR className="font-medium"><TD className="sticky-col font-medium">Actual</TD>{data.consumption.map((item) => <TD key={item.month} className="tabular-nums">{formatCurrency(item.value)}</TD>)}<TD className="tabular-nums">{formatCurrency(data.consumption.reduce((sum, item) => sum + item.value, 0))}</TD></TR>
                    <TR><TD className="sticky-col font-medium">Projected</TD>{data.consumption.map((item) => {
                      const projection = projectedConsumption.find((projected) => projected.month === item.month);
                      return <TD key={item.month} className={cn('tabular-nums', projection ? 'text-mid-gray' : 'font-medium')}>{formatCurrency(projection?.value ?? item.value)}</TD>;
                    })}<TD className="tabular-nums text-mid-gray">{formatCurrency(projectedYearTotal)}</TD></TR>
                    <TR><TD className="sticky-col font-medium">MoM</TD>{data.consumption.map((item, index) => {
                      // Only closed months are comparable: the month still being loaded has partial ACR.
                      if (index === 0 || (openMonthIndex >= 0 && index >= openMonthIndex)) return <TD key={item.month} className="text-mid-gray">-</TD>;
                      const previousValue = data.consumption[index - 1].value;
                      const difference = item.value - previousValue;
                      const percentage = previousValue !== 0 ? (difference / previousValue) * 100 : undefined;
                      const differenceText = `${difference >= 0 ? '+' : '-'}US$ ${(Math.abs(difference) / 1_000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}k`;
                      const percentageText = percentage === undefined ? '-' : `${percentage >= 0 ? '+' : ''}${percentage.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
                      return <TD key={item.month} className="font-medium tabular-nums" style={{ color: toneColor(difference >= 0 ? 'positive' : 'negative') }}>{differenceText} / {percentageText}</TD>;
                    })}<TD className="text-mid-gray">-</TD></TR>
                  </TBody>
                </Table>
                </TableScroll>
              }
            />
          </Card>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardTitle>Daily up to date</CardTitle>
              <ChartPanel
                className="mt-4"
                storageKey="daily-up-to-date"
                chart={<DailyChartLazy data={dailySeries} formatValue={formatDecimal} />}
                table={
                  <TableScroll className="mt-4">
                  <Table>
                    <THead><tr><TH className="sticky-col">Account</TH>{data.dailyConsumption.map((item) => <TH key={item.month}>{item.month}</TH>)}</tr></THead>
                    <TBody><TR><TD className="sticky-col font-medium">CAF</TD>{data.dailyConsumption.map((item) => <TD key={item.month} className="tabular-nums">{item.value ? formatDecimal(item.value) : '-'}</TD>)}</TR></TBody>
                  </Table>
                  </TableScroll>
                }
              />
            </Card>
            <Card>
              <CardTitle>Daily MoM</CardTitle>
              {(() => {
                const available = data.dailyConsumption.filter((item) => item.value > 0).slice(-2);
                const previous = available[0];
                const current = available[1];
                const change = previous && current ? ((current.value - previous.value) / previous.value) * 100 : undefined;
                const currentProjection = calculateCurrentMonthProjection(data.dailyConsumption, referenceDate);
                const currentMonthLabel = currentProjection?.month ?? referenceDate.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                const projectedConsumption = currentProjection?.value;
                return <TableScroll className="mt-4"><Table><THead><tr><TH className="sticky-col">OB</TH><TH>Daily {previous?.month ?? '-'}</TH><TH>Daily {current?.month ?? '-'}</TH><TH>Daily MoM%</TH><TH>Project {currentMonthLabel}</TH></tr></THead><TBody><TR><TD className="sticky-col font-medium">CAF</TD><TD className="tabular-nums">{previous ? previous.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</TD><TD className="tabular-nums">{current ? current.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</TD><TD className="font-medium tabular-nums" style={{ color: toneColor(change !== undefined && change >= 0 ? 'positive' : 'negative') }}>{change !== undefined ? `${change >= 0 ? '+' : ''}${change.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%` : '-'}</TD><TD className="font-medium tabular-nums">{projectedConsumption === undefined ? '-' : projectedConsumption.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TD></TR></TBody></Table></TableScroll>;
              })()}
            </Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Expected Monthly MACC vs Current ACR</CardTitle>
              <Badge>MACC Burndown: {maccBurndown === undefined ? '-' : `${maccBurndown.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`}</Badge>
            </CardHeader>
            <ChartPanel
              className="mt-4"
              storageKey="macc-vs-acr"
              chart={<MaccChartLazy data={maccSeries} formatValue={formatCurrency} />}
              table={
                <TableScroll className="mt-4">
                <Table>
                  {(() => {
                    const activeMonths = data.maccComparison.filter((item) => item.actualAcr > 0);
                    const expectedTotal = activeMonths.reduce((sum, item) => sum + item.expectedMonthly, 0);
                    const actualTotal = data.maccComparison.reduce((sum, item) => sum + item.actualAcr, 0);
                    // The month still being loaded has partial ACR, so comparing it to a full month's MACC is misleading.
                    const closedMonths = activeMonths.filter((item) => item.month !== data.openConsumptionMonth);
                    const differenceTotal = closedMonths.reduce((sum, item) => sum + item.difference, 0);
                    return <>
                      <THead><tr><TH>Account</TH>{data.maccComparison.map((item) => <TH key={item.month}>{item.month}</TH>)}<TH>Total</TH></tr></THead>
                      <TBody>
                        <TR><TD className="font-medium">Expected MACC</TD>{data.maccComparison.map((item) => <TD key={item.month} className="tabular-nums">{item.actualAcr > 0 ? formatCurrency(item.expectedMonthly) : '-'}</TD>)}<TD className="font-medium tabular-nums">{expectedTotal ? formatCurrency(expectedTotal) : '-'}</TD></TR>
                        <TR><TD className="font-medium">Current ACR</TD>{data.maccComparison.map((item) => <TD key={item.month} className="tabular-nums">{item.actualAcr > 0 ? formatCurrency(item.actualAcr) : '-'}</TD>)}<TD className="font-medium tabular-nums">{actualTotal ? formatCurrency(actualTotal) : '-'}</TD></TR>
                        <TR><TD className="font-medium">Difference (ACR - expected)</TD>{data.maccComparison.map((item) => {
                          const isClosed = item.actualAcr > 0 && item.month !== data.openConsumptionMonth;
                          if (!isClosed) return <TD key={item.month} className="text-mid-gray">-</TD>;
                          return <TD key={item.month} className="font-medium tabular-nums" style={{ color: toneColor(item.difference >= 0 ? 'positive' : 'negative') }}>{`${item.difference >= 0 ? '+' : ''}${formatCurrency(item.difference)}`}</TD>;
                        })}<TD className="font-medium tabular-nums" style={{ color: toneColor(differenceTotal >= 0 ? 'positive' : 'negative') }}>{closedMonths.length ? `${differenceTotal >= 0 ? '+' : ''}${formatCurrency(differenceTotal)}` : '-'}</TD></TR>
                      </TBody>
                    </>;
                  })()}
                </Table>
                </TableScroll>
              }
            />
          </Card>
        </section>}

      </div>
    </div>
  );
}

export default App;

function App() {
  const source = useDashboardSource();

  if (!source.data) {
    return (
      <ConnectScreen
        status={source.status}
        error={source.error}
        supportsFolder={source.supportsFolder}
        supportsFilePicker={source.supportsFilePicker}
        onConnectFolder={() => void source.connectFolder()}
        onReconnectFolder={() => void source.reconnectFolder()}
        onConnectFiles={() => void source.connectFiles()}
        onSelectFiles={(files) => void source.loadFiles(files)}
        onDropFiles={(transfer) => void source.dropFiles(transfer)}
      />
    );
  }

  return (
    <Dashboard
      data={source.data}
      accountFiles={source.accountFiles}
      selectedAccount={source.selectedAccount}
      onSelectAccount={(file) => void source.selectAccount(file)}
      onRefresh={() => void source.refresh()}
      isRefreshing={source.isRefreshing}
      sourceLabel={source.sourceLabel}
      onDisconnect={() => void source.disconnect()}
    />
  );
}