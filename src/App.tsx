import { Fragment, useEffect, useMemo, useState } from 'react';
import { Activity, Briefcase, CalendarClock, CheckCircle2, ChevronDown, ChevronRight, CircleHelp, Clock, FileDown, Filter, FolderKanban, HardDriveDownload, RefreshCw, Search, Shield, TrendingUp, UserRound } from 'lucide-react';
import type { DashboardSummary, Milestone, Opportunity } from './types/dashboard';
import { calculateCurrentMonthProjection, calculateProjectedBaselineByMonth } from './utils/date';
import { useDashboardSource } from './hooks/use-dashboard-source';
import ConnectScreen from './components/ConnectScreen';

const statusColors: Record<string, string> = {
  'On Track': '#2E7D32',
  Planning: '#0078D4',
  'At Risk': '#D97706',
  Blocked: '#D14343',
  Completed: '#17365D',
  'Not Started': '#5C2D91',
  Unknown: '#64748B',
};

const fiscalQuarter = (date: Date) => {
  const month = date.getMonth();
  if (month >= 6 && month <= 8) return 'Q1';
  if (month >= 9 && month <= 11) return 'Q2';
  if (month <= 2) return 'Q3';
  return 'Q4';
};

const quarterColors: Record<string, string> = {
  Q1: 'bg-sky-100 text-sky-800',
  Q2: 'bg-emerald-100 text-emerald-800',
  Q3: 'bg-amber-100 text-amber-800',
  Q4: 'bg-rose-100 text-rose-800',
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
type AccentColor = 'blue' | 'green' | 'red' | 'orange' | 'purple' | 'brown' | 'lightBlue' | 'darkBlue';

const FormulaHelp = ({ label, formula }: { label: string; formula: string }) => (
  <span className="group relative inline-flex">
    <button type="button" aria-label={`${label} formula: ${formula}`} className="inline-flex h-5 w-5 items-center justify-center text-slate-400 transition-colors hover:text-brand-blue focus:text-brand-blue focus:outline-none">
      <CircleHelp size={15} aria-hidden="true" />
    </button>
    <span role="tooltip" className="pointer-events-none invisible absolute right-0 top-7 z-20 w-60 rounded-md bg-slate-950 px-3 py-2 text-left text-xs font-normal leading-relaxed text-white opacity-0 shadow-lg transition-opacity group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
      {formula}
    </span>
  </span>
);

const accentColors: Record<AccentColor, { label: string; value: string }> = {
  blue: { label: 'Blue', value: '#0078D4' },
  green: { label: 'Green', value: '#2E7D32' },
  red: { label: 'Red', value: '#D14343' },
  orange: { label: 'Orange', value: '#D97706' },
  purple: { label: 'Purple', value: '#7B4BB7' },
  brown: { label: 'Brown', value: '#795548' },
  lightBlue: { label: 'Light blue', value: '#38BDF8' },
  darkBlue: { label: 'Dark Blue', value: '#17365D' },
};

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

  const projectedConsumption = useMemo(() => {
    return calculateProjectedBaselineByMonth(data.dailyConsumption);
  }, [data.dailyConsumption, refreshStamp]);

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

  const currentMonthProjection = useMemo(() => calculateCurrentMonthProjection(data.dailyConsumption), [data.dailyConsumption]);

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

  const formatPercent = (value?: number) => value === undefined
    ? '-'
    : `${value >= 0 ? '+' : ''}${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

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

  const pageClasses = isDark
    ? 'min-h-screen bg-slate-950 text-slate-100'
    : 'min-h-screen bg-slate-100 text-slate-800';
  const panelClasses = isDark
    ? 'rounded-2xl border border-slate-700 bg-slate-900 text-slate-100 shadow-soft'
    : 'rounded-2xl border border-slate-200 bg-white text-slate-800 shadow-soft';
  const mutedText = isDark ? 'text-slate-300' : 'text-slate-500';
  const subtlePanel = isDark ? 'border-slate-700 bg-slate-800 text-slate-100' : 'border-slate-200 bg-slate-50 text-slate-700';
  const inputClasses = isDark
    ? 'rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:border-brand-blue outline-none'
    : 'rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-brand-blue outline-none';

  return (
    <div className={pageClasses + ' accent-theme'} style={{ '--accent-color': accentColors[accentColor].value } as React.CSSProperties}>
      <div className="mx-auto max-w-7xl p-4 md:p-6">
        <header className={panelClasses + ' p-5'}>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0 shrink-0">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-blue">{accountName} | Executive Account Dashboard</p>
              <p className={isDark ? 'mt-2 text-sm font-medium text-slate-300' : 'mt-2 text-sm font-medium text-slate-500'}>TPID: {data.accountOverview.general.TPID}</p>
              <h1 className={isDark ? 'mt-2 text-2xl font-bold text-slate-100 md:text-3xl' : 'mt-2 text-2xl font-bold text-brand-night md:text-3xl'}>{t.accountView}</h1>
            </div>

            <div data-print="hide" className="flex flex-1 flex-wrap items-center justify-end gap-3">
              {accountFiles.length > 0 && (
                <label className={subtlePanel + ' flex items-center gap-2 rounded-xl px-3 py-2 text-sm'}>
                  <span className="font-medium">Account</span>
                  <select value={selectedAccount} onChange={(event) => onSelectAccount(event.target.value)} className="max-w-[220px] bg-transparent font-semibold outline-none">
                    {accountFiles.map((file) => <option key={file} value={file}>{accountLabel(file)}</option>)}
                  </select>
                </label>
              )}
              <label className={subtlePanel + ' flex items-center gap-2 rounded-xl px-2 py-1.5 text-xs font-medium'}>
                <span className="sr-only">Accent color</span>
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: accentColors[accentColor].value }} />
                <select value={accentColor} onChange={(event) => handleAccentColorChange(event.target.value as AccentColor)} className="max-w-[105px] bg-transparent text-xs outline-none">
                  {(Object.entries(accentColors) as [AccentColor, { label: string; value: string }][]).map(([key, option]) => <option key={key} value={key}>{option.label}</option>)}
                </select>
              </label>
              <button
                type="button"
                onClick={() => setIsDark((value) => !value)}
                className={'inline-flex min-w-[5rem] items-center justify-center ' + (isDark
                  ? 'rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-100'
                  : 'rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700')}
              >
                {isDark ? t.light : t.dark}
              </button>
              <button
                type="button"
                onClick={() => setMode((value) => (value === 'rob' ? 'presentation' : 'rob'))}
                className={'inline-flex min-w-[7.5rem] items-center justify-center ' + (isDark
                  ? 'rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-100'
                  : 'rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700')}
              >
                {mode === 'rob' ? 'Presentation' : 'ROB'}
              </button>
              <button
                type="button"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className={'inline-flex min-w-[8rem] items-center justify-center gap-2 ' + (isDark ? 'rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-100 disabled:cursor-not-allowed disabled:opacity-60' : 'rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-60')}
              >
                <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} /> {isRefreshing ? t.refreshing : t.refresh}
              </button>
              <div className={subtlePanel + ' rounded-xl px-3 py-2 text-sm'}>
                <div className={mutedText}>{t.lastUpdate}</div>
                <div className={isDark ? 'font-semibold text-slate-100' : 'font-semibold text-brand-night'}>{new Date(data.lastUpdated).toLocaleString(language === 'pt' ? 'pt-BR' : language === 'es' ? 'es-ES' : 'en-US', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
              </div>
              {mode === 'presentation' && (
                <button
                  type="button"
                  onClick={handleExportPdf}
                  className={'inline-flex min-w-[8rem] items-center justify-center gap-2 ' + (isDark
                    ? 'rounded-xl border border-slate-600 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-100'
                    : 'rounded-xl border border-slate-200 bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700')}
                >
                  <FileDown size={14} /> PDF Export
                </button>
              )}
              <div className="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
                <HardDriveDownload size={13} className="shrink-0" />
                {/* The only control sized by its content: it grows with the file or folder name. */}
                <span className="max-w-[28rem] truncate" title={sourceLabel}>{sourceLabel || t.excelUpdated}</span>
                <button type="button" onClick={onDisconnect} className="font-medium text-emerald-800/80 underline underline-offset-2 hover:text-emerald-900">
                  {t.changeSource}
                </button>
              </div>
            </div>
          </div>
        </header>

        {mode === 'rob' && <nav className={panelClasses + ' mt-4 flex flex-wrap gap-2 p-2'} aria-label="Dashboard views">
          {([['overview', 'Overview'], ['atu-stu', 'ATU/STU'], ['csu', 'CSU']] as const).map(([key, label]) => (
            <button key={key} type="button" onClick={() => setView(key)} className={view === key ? 'rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white shadow-sm' : 'rounded-lg px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100'}>
              {label}
            </button>
          ))}
        </nav>}

        {mode === 'rob' && view === 'overview' && <>
        <section className="mt-6">
          <div className={panelClasses + ' p-5'}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className={isDark ? 'text-lg font-semibold text-slate-100' : 'text-lg font-semibold text-brand-night'}>{t.executiveSummary}</h2>
              <span className={mutedText + ' text-sm'}>
                Last session: {data.lastSessionDate && data.lastSessionDate !== 'Not informed'
                  ? new Date(data.lastSessionDate).toLocaleDateString('pt-BR', { timeZone: 'UTC' })
                  : 'Not informed'}
              </span>
            </div>
            <div className={isDark ? 'space-y-4 text-sm leading-relaxed text-slate-300' : 'space-y-4 text-sm leading-relaxed text-slate-600'}>
              <p className="whitespace-pre-line">{data.executiveSummary}</p>
            </div>
          </div>
        </section>

        {false && <section className={panelClasses + ' mt-6 p-5'}>
          <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <h2 className={isDark ? 'text-lg font-semibold text-slate-100' : 'text-lg font-semibold text-brand-night'}>{t.opportunities}</h2>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-3 text-slate-400" size={15} />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t.searchOpportunity} className={inputClasses + ' py-2 pl-9 pr-3'} />
              </div>
              <button onClick={resetFilters} className={isDark ? 'rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm font-medium text-slate-100' : 'rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700'}>{t.clearFilters}</button>
            </div>
          </div>

          <div className="mb-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <select value={verticalFilter} onChange={(e) => setVerticalFilter(e.target.value)} className={inputClasses}><option value="all">{t.vertical}</option>{verticalOptions.filter(v => v !== 'all').map(v => <option key={v} value={v}>{v}</option>)}</select>
            <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} className={inputClasses}><option value="all">{t.stage}</option>{stageOptions.filter(v => v !== 'all').map(v => <option key={v} value={v}>{v}</option>)}</select>
            <select value={commitmentFilter} onChange={(e) => setCommitmentFilter(e.target.value)} className={inputClasses}><option value="all">{t.commitment}</option>{commitmentOptions.filter(v => v !== 'all').map(v => <option key={v} value={v}>{v}</option>)}</select>
            <select value={ownerFilter} onChange={(e) => setOwnerFilter(e.target.value)} className={inputClasses}><option value="all">{t.owner}</option>{ownerOptions.filter(v => v !== 'all').map(v => <option key={v} value={v}>{v}</option>)}</select>
            <select value={handoffFilter} onChange={(e) => setHandoffFilter(e.target.value)} className={inputClasses}><option value="all">{t.handoff}</option>{handoffOptions.filter(v => v !== 'all').map(v => <option key={v} value={v}>{v}</option>)}</select>
          </div>

          <div className="table-scroll overflow-x-auto">
            <table className={isDark ? 'min-w-full text-left text-sm text-slate-100' : 'min-w-full text-left text-sm text-slate-800'}>
              <thead className={isDark ? 'bg-slate-800 text-slate-200' : 'bg-slate-50 text-slate-600'}>
                <tr>
                  <th className="p-3 font-semibold">{t.vertical}</th>
                  <th className="p-3 font-semibold">Opportunity</th>
                  <th className="p-3 font-semibold">{t.opportunityId}</th>
                  <th className="p-3 font-semibold">{t.stage}</th>
                  <th className="p-3 font-semibold">{t.commitment}</th>
                  <th className="p-3 font-semibold">{t.owner}</th>
                  <th className="p-3 font-semibold">{t.consumedRecurring}</th>
                  <th className="p-3 font-semibold">{t.handoff}</th>
                  <th className="p-3 font-semibold">{t.risk}</th>
                </tr>
              </thead>
              <tbody>
                {filteredOpportunities.map((opportunity, index) => (
                    <tr key={`${opportunity.opportunityId}-${index}`} className={isDark ? 'border-t border-slate-700 align-top' : 'border-t border-slate-100 align-top'}>
                      <td className="p-3">{opportunity.vertical}</td>
                      <td className={isDark ? 'p-3 font-medium text-slate-100' : 'p-3 font-medium text-brand-night'}>{opportunity.name}</td>
                      <td className="p-3">{opportunity.opportunityId}</td>
                      <td className="p-3">{opportunity.stage}</td>
                      <td className="p-3">{opportunity.customerCommitment}</td>
                      <td className="p-3">{opportunity.ownership}</td>
                      <td className="p-3">{opportunity.monthlyUsage}</td>
                      <td className="p-3">{opportunity.handoff}</td>
                      <td className="p-3">{opportunity.risk}</td>
                    </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>}

        {false && <section className="mt-6">
          <div className={panelClasses + ' p-5'}>
            <h2 className={isDark ? 'text-lg font-semibold text-slate-100' : 'text-lg font-semibold text-brand-night'}>{t.milestones}</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
              <input value={milestoneSearch} onChange={(e) => setMilestoneSearch(e.target.value)} placeholder={t.searchMilestone} className={inputClasses} />
              <select value={milestoneStatusFilter} onChange={(e) => setMilestoneStatusFilter(e.target.value)} className={inputClasses}><option value="all">{t.milestoneStatus}</option>{milestoneStatusOptions.filter(v => v !== 'all').map(v => <option key={v} value={v}>{v}</option>)}</select>
              <select value={milestoneCommitmentFilter} onChange={(e) => setMilestoneCommitmentFilter(e.target.value)} className={inputClasses}><option value="all">{t.commitment}</option>{milestoneCommitmentOptions.filter(v => v !== 'all').map(v => <option key={v} value={v}>{v}</option>)}</select>
              <select value={milestoneOwnerFilter} onChange={(e) => setMilestoneOwnerFilter(e.target.value)} className={inputClasses}><option value="all">{t.owner}</option>{milestoneOwnerOptions.filter(v => v !== 'all').map(v => <option key={v} value={v}>{v}</option>)}</select>
              <select value={milestoneCategoryFilter} onChange={(e) => setMilestoneCategoryFilter(e.target.value)} className={inputClasses}><option value="all">{t.category}</option>{milestoneCategoryOptions.filter(v => v !== 'all').map(v => <option key={v} value={v}>{v}</option>)}</select>
              <select value={milestoneHandoffFilter} onChange={(e) => setMilestoneHandoffFilter(e.target.value)} className={inputClasses}><option value="all">{t.handoff}</option>{milestoneHandoffOptions.filter(v => v !== 'all').map(v => <option key={v} value={v}>{v}</option>)}</select>
            </div>
            <div className="mt-4 space-y-3">
              {filteredMilestones.slice(0, 6).map((milestone) => (
                <div key={milestone.milestoneId} className={isDark ? 'rounded-xl border border-slate-700 bg-slate-800 p-3' : 'rounded-xl border border-slate-200 bg-slate-50 p-3'}>
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className={isDark ? 'font-semibold text-slate-100' : 'font-semibold text-brand-night'}>{milestone.title}</div>
                      <div className={isDark ? 'text-xs text-slate-400' : 'text-xs text-slate-500'}>{milestone.opportunityName}</div>
                    </div>
                    <span className="status-pill" style={{ background: `${statusColors[milestone.status] || '#64748B'}22`, color: statusColors[milestone.status] || '#64748B' }}>{milestone.status}</span>
                  </div>
                  <div className={isDark ? 'mt-2 grid gap-2 text-xs text-slate-300 md:grid-cols-2' : 'mt-2 grid gap-2 text-xs text-slate-600 md:grid-cols-2'}>
                    <span>Owner: {milestone.owner}</span>
                    <span>Estimated Date: {milestone.estimatedDateText}</span>
                    <span>Est. Monthly Usage: {milestone.estimatedMonthlyUsage ?? ''}</span>
                    <span>Categoria: {milestone.category}</span>
                    <span>Handoff: {milestone.handoffCondition}</span>
                    <span>Commitment: {milestone.customerCommitment}</span>
                    <span>Risk / Blocker: {milestone.risk}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </section>}

        <section className="mt-6">
          <div className={panelClasses + ' p-5'}>
            <h2 className="text-lg font-semibold">Contracts</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{data.accountOverview.contracts.map((contract, index) => (
              <div key={`${contract['Tipo de Contrato']}-${index}`} className={subtlePanel + ' rounded-lg border p-3 text-sm'}>
                <strong>{[contract['Tipo de Contrato'], contract.Tecnologia].map((value) => (value ?? '').trim()).filter((value) => value && value !== '-').join(' | ')}</strong>
                <div>{contract['Quantidade / Valor']} · {contract.Vigencia}</div>
                <div className={mutedText}>{contract.Status}</div>
              </div>
            ))}</div>
          </div>
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
            <div key={title} className={panelClasses + ' p-5'}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold">{title}</h2>
                <span className={mutedText + ' text-sm'}>{people.length} people</span>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                {people.map((person, index) => {
                  const email = (person.email ?? '').trim();
                  return (
                    <div key={`${person.name}-${index}`} className={subtlePanel + ' rounded-lg border p-3'}>
                      <strong>{person.name}</strong>
                      <div>{[person.role, person.context].filter((value) => value && value !== '-').join(' · ')}</div>
                      <div className={mutedText}>
                        {isEmailAddress(email)
                          ? <a href={`mailto:${email}`} className="underline decoration-dotted underline-offset-2 hover:text-brand-blue">{email}</a>
                          : email}
                      </div>
                    </div>
                  );
                })}
                {!people.length && <div className={mutedText}>Not informed in the workbook.</div>}
              </div>
            </div>
          ))}
        </section>
        </>}

        {mode === 'rob' && view === 'csu' && <section className="mt-6 space-y-6">
          <div className={panelClasses + ' overflow-x-auto p-5'}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">CSU Packages</h2>
              <div className="text-sm"><span className={mutedText}>Total Hours Sold: </span><span className="font-semibold">{formatNumber(data.totalHoursSold)}h</span></div>
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <select value={csuPackageFilter} onChange={(e) => setCsuPackageFilter(e.target.value)} className={inputClasses}><option value="all">Package</option>{csuPackageOptions.filter((value) => value !== 'all').map((value) => <option key={value} value={value}>{value}</option>)}</select>
              <select value={csuStatusFilter} onChange={(e) => setCsuStatusFilter(e.target.value)} className={inputClasses}><option value="all">Status</option>{csuStatusOptions.filter((value) => value !== 'all').map((value) => <option key={value} value={value}>{value}</option>)}</select>
              <select value={csuCsaFilter} onChange={(e) => setCsuCsaFilter(e.target.value)} className={inputClasses}><option value="all">CSA</option>{csuCsaOptions.filter((value) => value !== 'all').map((value) => <option key={value} value={value}>{value}</option>)}</select>
            </div>
            <table className="mt-4 min-w-full text-left text-sm">
              <thead><tr>{['', 'Package', 'Description', 'Hours sold', 'Hours consumed', 'Hours balance', 'Hours planned'].map((header) => <th key={header} className="p-2">{header}</th>)}</tr></thead>
              <tbody>
                {filteredCsuPackages.map((pkg) => {
                  const isExpanded = expandedPackages[pkg.name] ?? false;
                  const balance = pkg.soldHours - pkg.hoursConsumed;
                  return (
                    <Fragment key={pkg.name}>
                      <tr className="border-t border-slate-200">
                        <td className="p-2">
                          <button
                            type="button"
                            onClick={() => setExpandedPackages((current) => ({ ...current, [pkg.name]: !isExpanded }))}
                            aria-expanded={isExpanded}
                            aria-label={`${isExpanded ? 'Recolher' : 'Expandir'} ${pkg.name}`}
                            className="font-semibold text-brand-blue"
                          >
                            {isExpanded ? '−' : '+'}
                          </button>
                        </td>
                        <td className="p-2 font-semibold">{pkg.name}</td>
                        <td className="p-2">{pkg.description}</td>
                        <td className="p-2">{pkg.soldHours ? `${formatNumber(pkg.soldHours)}h` : '-'}</td>
                        <td className="p-2">{formatNumber(pkg.hoursConsumed)}h</td>
                        <td className={balance >= 0 ? 'p-2 font-semibold text-emerald-600' : 'p-2 font-semibold text-red-600'}>{pkg.soldHours ? `${balance >= 0 ? '+' : ''}${formatNumber(balance)}h` : '-'}</td>
                        <td className="p-2">{formatNumber(pkg.hoursPlanned)}h</td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className={isDark ? 'bg-slate-800 p-0' : 'bg-slate-50 p-0'}>
                            <table className="min-w-full text-left text-xs">
                              <thead><tr>{['Project', 'Dispatch', 'End Date', 'CSA', 'Planned', 'Hours', 'Stakeholder', 'Status'].map((header) => <th key={header} className="p-2">{header}</th>)}</tr></thead>
                              <tbody>
                                {pkg.projects.map((project, index) => {
                                  const isDone = project.status.trim().toLowerCase() === 'done';
                                  const StatusIcon = isDone ? CheckCircle2 : Clock;
                                  const statusColor = isDone ? '#2E7D32' : '#D97706';
                                  return (
                                    <tr key={`${pkg.name}-${index}`} className={isDone ? (isDark ? 'border-t border-slate-700 bg-slate-900/80' : 'border-t border-slate-200 bg-slate-200') : 'border-t border-slate-200'}>
                                      <td className="p-2">{project.name}</td>
                                      <td className="p-2">{project.dispatchUrl ? <a href={project.dispatchUrl} target="_blank" rel="noreferrer" className="text-brand-blue underline">{project.dispatch}</a> : project.dispatch}</td>
                                      <td className="p-2">{project.endDate}</td>
                                      <td className="p-2">{project.csa}</td>
                                      <td className="p-2">{formatNumber(project.planned)}</td>
                                      <td className="p-2">{formatNumber(project.hours)}</td>
                                      <td className="p-2">{project.stakeholder}</td>
                                      <td className="p-2"><span className="inline-flex items-center gap-1" style={{ color: statusColor }}><StatusIcon size={14} />{project.status}</span></td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className={panelClasses + ' p-5'}>
            <h2 className="text-lg font-semibold">Success Programs</h2>
            <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">{data.accountOverview.successPrograms.map((program, index) => <div key={`${program['Success Program']}-${index}`} className={subtlePanel + ' rounded-lg border p-3'}><strong>{program['Success Program'] || 'Not informed'}</strong><div>{program.Vertical} · {program.Atual} · {program.Unidade} · {program.Status}</div></div>)}</div>
          </div>
          {/* Only the table scrolls sideways: on the panel the scrollbar would shrink the cards above. */}
          <div className={panelClasses + ' p-5'}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setAreCsuMilestonesExpanded((value) => !value)}
                aria-expanded={areCsuMilestonesExpanded}
                className="inline-flex items-center gap-2 text-lg font-semibold hover:text-brand-blue"
              >
                {areCsuMilestonesExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                CSU Milestones
              </button>
              <span className={isDark ? 'text-sm text-slate-300' : 'text-sm text-slate-600'}>{visibleCsuMilestones.length} committed milestones in period</span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className={subtlePanel + ' rounded-xl border p-3'}>
                <div className={mutedText + ' text-xs font-medium uppercase tracking-wide'}>Total Est. Monthly Usage</div>
                <div className="mt-1 text-xl font-bold tabular-nums">{formatCurrency(csuMilestoneTotals.estimatedMonthlyUsage)}</div>
              </div>
              <div className={subtlePanel + ' rounded-xl border p-3'}>
                <div className={mutedText + ' text-xs font-medium uppercase tracking-wide'}>On Track</div>
                <div className="mt-1 text-xl font-bold tabular-nums" style={{ color: statusColors['On Track'] }}>{csuMilestoneTotals.onTrack}</div>
              </div>
              <div className={subtlePanel + ' rounded-xl border p-3'}>
                <div className={mutedText + ' text-xs font-medium uppercase tracking-wide'}>Blocked</div>
                <div className="mt-1 text-xl font-bold tabular-nums" style={{ color: statusColors.Blocked }}>{csuMilestoneTotals.blocked}</div>
              </div>
            </div>
            {areCsuMilestonesExpanded && <div className="overflow-x-auto"><table className="mt-4 min-w-full text-left text-sm">
              <thead><tr>
                {([['Milestone', 'title'], ['Milestone ID', 'milestoneId'], ['Opportunity', 'opportunityName'], ['Owner', 'owner'], ['Estimated Date', 'estimatedDate'], ['Est. Monthly Usage', 'estimatedMonthlyUsage'], ['Customer Commitment', 'customerCommitment']] as const).map(([header, key]) => (
                  <th key={key} className="p-2">
                    <button type="button" onClick={() => setCsuMilestoneSortKey(key)} className="inline-flex items-center gap-1 font-semibold hover:text-brand-blue" aria-label={`Sort by ${header}`}>
                      {header}<span className="text-xs text-slate-400">{csuMilestoneSort.key === key ? (csuMilestoneSort.direction === 'asc' ? '↑' : '↓') : '↕'}</span>
                    </button>
                  </th>
                ))}
                <th className="p-2">Quarter</th>
                <th className="p-2">
                  <button type="button" onClick={() => setCsuMilestoneSortKey('status')} className="inline-flex items-center gap-1 font-semibold hover:text-brand-blue" aria-label="Sort by Status">
                    Status<span className="text-xs text-slate-400">{csuMilestoneSort.key === 'status' ? (csuMilestoneSort.direction === 'asc' ? '↑' : '↓') : '↕'}</span>
                  </button>
                </th>
              </tr></thead>
              <tbody>
                {visibleCsuMilestones.map((milestone, index) => {
                  const milestoneDate = new Date(milestone.estimatedDate ?? '');
                  const quarter = fiscalQuarter(milestoneDate);
                  return <tr key={`${milestone.milestoneId}-${index}`} className="border-t border-slate-200">
                    <td className="p-2 font-medium">{milestone.title}</td>
                    <td className="p-2">{milestone.milestoneUrl ? <a href={milestone.milestoneUrl} target="_blank" rel="noreferrer" className="font-medium text-blue-600 underline decoration-blue-300 underline-offset-2 hover:text-blue-700">{milestone.milestoneId}</a> : milestone.milestoneId}</td>
                    <td className="p-2">{milestone.opportunityName || '-'}</td>
                    <td className="p-2">{milestone.owner}</td>
                    <td className="p-2">{milestone.estimatedDateText}</td>
                    <td className="p-2">{milestone.estimatedMonthlyUsage === undefined ? '-' : formatCurrency(milestone.estimatedMonthlyUsage)}</td>
                    <td className="p-2">{milestone.customerCommitment ?? '-'}</td>
                    <td className="p-2"><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${quarterColors[quarter]}`}>{quarter}</span></td>
                    <td className="p-2"><span className="status-pill" style={{ background: `${statusColors[milestone.status] || '#64748B'}22`, color: statusColors[milestone.status] || '#64748B' }}>{milestone.status}</span></td>
                  </tr>;
                })}
                {!visibleCsuMilestones.length && <tr><td colSpan={9} className={isDark ? 'p-4 text-center text-slate-400' : 'p-4 text-center text-slate-500'}>No milestones in the selected period.</td></tr>}
              </tbody>
            </table></div>}
          </div>
        </section>}


        {mode === 'presentation' && <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            {presentationGroups.map((group) => (
              <div key={group.title} className={panelClasses + ' p-5'}>
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className={isDark ? 'text-lg font-semibold text-slate-100' : 'text-lg font-semibold text-brand-night'}>{group.title}</h2>
                  {group.caption && <span className={mutedText + ' text-xs font-medium'}>{group.caption}</span>}
                </div>
                {/* A shared 12-column grid: metrics split it evenly and line up across panels. */}
                <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-12">
                  {group.cards.map((card) => (
                    // Centering inside each equal column keeps the outer margins symmetric.
                    <div key={card.label} className="min-w-0 text-center" style={{ gridColumn: `span ${12 / group.cards.length}` }}>
                      {/* Fixed label height keeps every value on the same baseline. */}
                      <div className={mutedText + ' flex min-h-[2rem] items-start justify-center text-xs font-medium uppercase tracking-wide'}>{card.label}</div>
                      <div
                        className="mt-1 text-2xl font-bold leading-tight tracking-tight tabular-nums break-words xl:text-xl 2xl:text-2xl"
                        style={card.tone ? { color: card.tone === 'positive' ? '#2E7D32' : '#D14343' } : undefined}
                      >
                        {card.value}
                      </div>
                      {card.hint && <div className={mutedText + ' mt-1 text-xs font-medium'}>{card.hint}</div>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className={panelClasses + ' p-5'}>
            <h2 className={isDark ? 'text-lg font-semibold text-slate-100' : 'text-lg font-semibold text-brand-night'}>5. Comments</h2>
            <div className="mt-4 space-y-5">
              {([
                ['Opportunities', data.executiveHighlights.opportunities, '#2E7D32'],
                ['Risks', data.executiveHighlights.risks, '#D14343'],
                ['Asks', data.executiveHighlights.asks, '#0078D4'],
                ['Pending', data.executiveHighlights.pending, '#D97706'],
              ] as const).map(([label, content, color]) => (
                <div key={label} className="border-l-4 pl-3" style={{ borderLeftColor: color }}>
                  <h3 className="text-xs font-semibold uppercase tracking-wide" style={{ color }}>{label}</h3>
                  <p className={(isDark ? 'text-slate-300' : 'text-slate-600') + ' mt-1 whitespace-pre-line text-sm'}>{content}</p>
                </div>
              ))}
            </div>
          </div>
        </section>}

        {mode === 'rob' && view === 'atu-stu' && <section className="mt-6 space-y-6">
          {/* Only the table scrolls sideways: on the panel the scrollbar would shrink the cards above. */}
          <div className={panelClasses + ' p-5'}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setAreAtuOpportunitiesExpanded((value) => !value)}
                aria-expanded={areAtuOpportunitiesExpanded}
                className="inline-flex items-center gap-2 text-lg font-semibold hover:text-brand-blue"
              >
                {areAtuOpportunitiesExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                Opportunities
              </button>
              <span className={isDark ? 'text-sm text-slate-300' : 'text-sm text-slate-600'}>{sortedAtuOpportunities.length} opportunities</span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {([
                ['Total Pipeline', 'Committed Pipeline + Uncommitted Pipeline for the listed opportunities.', atuOpportunityTotals.pipelineTotal, undefined],
                ['Committed Pipeline', 'Sum of Consumed Recurring for the listed opportunities marked as Committed.', atuOpportunityTotals.committed, statusColors['On Track']],
                ['Uncommitted Pipeline', 'Sum of Consumed Recurring for the listed opportunities not marked as Committed.', atuOpportunityTotals.uncommitted, statusColors.Planning],
                ['Azure ACR Projected', "Closed-month Actuals + remaining fiscal-year projection. The month in progress uses its own Average Daily; later months use the last closed month's Average Daily. Each is multiplied by the calendar days in that month. Not affected by the filters below.", projectedYearTotal, undefined],
                ['PBO', 'Closed-month Actuals + Projected Baseline + Committed Pipeline. Equivalent to Azure ACR Projected + Committed Pipeline. Not affected by the filters below.', pbo, undefined],
              ] as const).map(([label, formula, value, color]) => (
                <div key={label} className={subtlePanel + ' rounded-xl border p-3'}>
                  {/* Fixed label height keeps every value on the same baseline when a title wraps. */}
                  <div className={mutedText + ' flex min-h-[2rem] items-start gap-1 text-xs font-medium uppercase tracking-wide'}>
                    <span className="min-w-0">{label}</span>
                    <span className="shrink-0"><FormulaHelp label={label} formula={formula} /></span>
                  </div>
                  <div className="mt-1 text-xl font-bold tabular-nums" style={color ? { color } : undefined}>{formatCurrency(value)}</div>
                </div>
              ))}
            </div>
            {areAtuOpportunitiesExpanded && <div className="overflow-x-auto"><div className="mt-4 grid min-w-[900px] gap-3 md:grid-cols-2 xl:grid-cols-4">
              <select value={atuVerticalFilter} onChange={(e) => setAtuVerticalFilter(e.target.value)} className={inputClasses}><option value="all">Vertical</option>{atuVerticalOptions.filter((value) => value !== 'all').map((value) => <option key={value}>{value}</option>)}</select>
              <select value={atuStageFilter} onChange={(e) => setAtuStageFilter(e.target.value)} className={inputClasses}><option value="all">Opportunity Stage</option>{atuStageOptions.filter((value) => value !== 'all').map((value) => <option key={value}>{value}</option>)}</select>
              <select value={atuCommitmentFilter} onChange={(e) => setAtuCommitmentFilter(e.target.value)} className={inputClasses}><option value="all">Customer Commitment</option>{atuCommitmentOptions.filter((value) => value !== 'all').map((value) => <option key={value}>{value}</option>)}</select>
              <select value={atuOwnerFilter} onChange={(e) => setAtuOwnerFilter(e.target.value)} className={inputClasses}><option value="all">Owner</option>{atuOwnerOptions.filter((value) => value !== 'all').map((value) => <option key={value}>{value}</option>)}</select>
            </div>
            <table className="mt-4 min-w-full text-left text-sm">
              <thead><tr>{([['Vertical', 'vertical'], ['Opportunity', 'opportunityName'], ['Opportunity ID', 'opportunityId'], ['Opportunity Stage', 'stage'], ['Customer Commitment', 'customerCommitment'], ['Owner', 'owner'], ['Pipeline total', 'pipelineTotal'], ['Handoff to CSU', 'handoff'], ['Risk / Blocker', 'risk']] as const).map(([header, key]) => <th key={key} className="p-2"><button type="button" onClick={() => setAtuSortKey(key)} className="inline-flex items-center gap-1 font-semibold hover:text-brand-blue" aria-label={`Sort by ${header}`}>{header}<span className="text-xs text-slate-400">{atuSort.key === key ? (atuSort.direction === 'asc' ? '↑' : '↓') : '↕'}</span></button></th>)}</tr></thead>
              <tbody>{sortedAtuOpportunities.map((opportunity) => <tr key={opportunity.opportunityId} className="border-t border-slate-200"><td className="p-2">{opportunity.vertical}</td><td className="p-2">{opportunity.opportunityName}</td><td className="p-2">{opportunity.opportunityUrl ? <a href={opportunity.opportunityUrl} target="_blank" rel="noreferrer" className="text-brand-blue underline">{opportunity.opportunityId}</a> : opportunity.opportunityId}</td><td className="p-2">{opportunity.stage}</td><td className="p-2">{opportunity.customerCommitment}</td><td className="p-2">{opportunity.owner}</td><td className="p-2">{formatCurrency(opportunity.pipelineTotal)}</td><td className="p-2">{opportunity.handoff}</td><td className="p-2">{opportunity.risk}</td></tr>)}
              {!sortedAtuOpportunities.length && <tr><td colSpan={9} className={isDark ? 'p-4 text-center text-slate-400' : 'p-4 text-center text-slate-500'}>No opportunities for the selected filters.</td></tr>}</tbody>
            </table></div>}
          </div>
          <div className={panelClasses + ' p-5'}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Monthly Consumption</h2>
              <span className={isDark ? 'text-sm text-slate-300' : 'text-sm text-slate-600'}>
                Last update: {data.consumptionLastUpdated ? new Date(data.consumptionLastUpdated).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-'}
              </span>
            </div>
            <div className="overflow-x-auto">
            <table className="mt-4 min-w-full text-left text-sm">
              <thead><tr><th className="sticky-col p-2">Account</th>{data.consumption.map((item) => <th key={item.month} className="p-2">{item.month}</th>)}<th className="p-2">Total</th></tr></thead>
              <tbody>
                <tr className="border-t border-slate-200 font-bold"><td className="sticky-col p-2">Actual</td>{data.consumption.map((item) => <td key={item.month} className="p-2">{formatCurrency(item.value)}</td>)}<td className="p-2">{formatCurrency(data.consumption.reduce((sum, item) => sum + item.value, 0))}</td></tr>
                <tr className="border-t border-slate-200"><td className="sticky-col p-2 font-bold">Projected</td>{data.consumption.map((item) => {
                  const projection = projectedConsumption.find((projected) => projected.month === item.month);
                  return <td key={item.month} className={projection ? 'p-2 text-slate-400' : 'p-2 font-bold'}>{formatCurrency(projection?.value ?? item.value)}</td>;
                })}<td className="p-2 font-semibold text-slate-400">{formatCurrency(projectedYearTotal)}</td></tr>
                <tr className="border-t border-slate-200"><td className="sticky-col p-2 font-semibold">MoM</td>{data.consumption.map((item, index) => {
                  // Only closed months are comparable: the month still being loaded has partial ACR.
                  if (index === 0 || (openMonthIndex >= 0 && index >= openMonthIndex)) return <td key={item.month} className="p-2">-</td>;
                  const previousValue = data.consumption[index - 1].value;
                  const difference = item.value - previousValue;
                  const percentage = previousValue !== 0 ? (difference / previousValue) * 100 : undefined;
                  const colorClass = difference >= 0 ? 'p-2 font-semibold text-emerald-600' : 'p-2 font-semibold text-red-600';
                  const differenceText = `${difference >= 0 ? '+' : '-'}US$ ${(Math.abs(difference) / 1_000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}k`;
                  const percentageText = percentage === undefined ? '-' : `${percentage >= 0 ? '+' : ''}${percentage.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
                  return <td key={item.month} className={colorClass}>{differenceText} / {percentageText}</td>;
                })}<td className="p-2">-</td></tr>
              </tbody>
            </table>
            </div>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <div className={panelClasses + ' p-5'}>
              <h2 className="text-lg font-semibold">Daily up to date</h2>
              <div className="overflow-x-auto">
              <table className="mt-4 min-w-full text-left text-sm">
                <thead><tr><th className="sticky-col p-2">Account</th>{data.dailyConsumption.map((item) => <th key={item.month} className="p-2">{item.month}</th>)}</tr></thead>
                <tbody><tr className="border-t border-slate-200"><td className="sticky-col p-2 font-semibold">CAF</td>{data.dailyConsumption.map((item) => <td key={item.month} className="p-2">{item.value ? item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</td>)}</tr></tbody>
              </table>
              </div>
            </div>
            <div className={panelClasses + ' p-5'}>
              <h2 className="text-lg font-semibold">Daily MoM</h2>
              {(() => {
                const available = data.dailyConsumption.filter((item) => item.value > 0).slice(-2);
                const previous = available[0];
                const current = available[1];
                const change = previous && current ? ((current.value - previous.value) / previous.value) * 100 : undefined;
                const currentProjection = calculateCurrentMonthProjection(data.dailyConsumption);
                const currentMonthLabel = currentProjection?.month ?? new Date().toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                const projectedConsumption = currentProjection?.value;
                return <div className="overflow-x-auto"><table className="mt-4 min-w-full text-left text-sm"><thead><tr><th className="sticky-col p-2">OB</th><th className="p-2">Daily {previous?.month ?? '-'}</th><th className="p-2">Daily {current?.month ?? '-'}</th><th className="p-2">Daily MoM%</th><th className="p-2">Project {currentMonthLabel}</th></tr></thead><tbody><tr className="border-t border-slate-200"><td className="sticky-col p-2 font-semibold">CAF</td><td className="p-2">{previous ? previous.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</td><td className="p-2">{current ? current.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}</td><td className={change !== undefined && change >= 0 ? 'p-2 font-semibold text-emerald-600' : 'p-2 font-semibold text-red-600'}>{change !== undefined ? `${change >= 0 ? '+' : ''}${change.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%` : '-'}</td><td className="p-2 font-semibold">{projectedConsumption === undefined ? '-' : projectedConsumption.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr></tbody></table></div>;
              })()}
            </div>
          </div>
          <div className={panelClasses + ' overflow-x-auto p-5'}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Expected Monthly MACC vs Current ACR</h2>
              <span className={isDark ? 'text-sm text-slate-300' : 'text-sm text-slate-600'}>MACC Burndown: {maccBurndown === undefined ? '-' : `${maccBurndown.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`}</span>
            </div>
            <table className="mt-4 min-w-full text-left text-sm">
              {(() => {
                const activeMonths = data.maccComparison.filter((item) => item.actualAcr > 0);
                const expectedTotal = activeMonths.reduce((sum, item) => sum + item.expectedMonthly, 0);
                const actualTotal = data.maccComparison.reduce((sum, item) => sum + item.actualAcr, 0);
                // The month still being loaded has partial ACR, so comparing it to a full month's MACC is misleading.
                const closedMonths = activeMonths.filter((item) => item.month !== data.openConsumptionMonth);
                const differenceTotal = closedMonths.reduce((sum, item) => sum + item.difference, 0);
                return <>
                  <thead><tr><th className="p-2">Account</th>{data.maccComparison.map((item) => <th key={item.month} className="p-2">{item.month}</th>)}<th className="p-2">Total</th></tr></thead>
                  <tbody>
                    <tr className="border-t border-slate-200"><td className="p-2 font-semibold">Expected MACC</td>{data.maccComparison.map((item) => <td key={item.month} className="p-2">{item.actualAcr > 0 ? formatCurrency(item.expectedMonthly) : '-'}</td>)}<td className="p-2 font-semibold">{expectedTotal ? formatCurrency(expectedTotal) : '-'}</td></tr>
                    <tr className="border-t border-slate-200"><td className="p-2 font-semibold">Current ACR</td>{data.maccComparison.map((item) => <td key={item.month} className="p-2">{item.actualAcr > 0 ? formatCurrency(item.actualAcr) : '-'}</td>)}<td className="p-2 font-semibold">{actualTotal ? formatCurrency(actualTotal) : '-'}</td></tr>
                    <tr className="border-t border-slate-200"><td className="p-2 font-semibold">Difference (ACR - expected)</td>{data.maccComparison.map((item) => {
                      const isClosed = item.actualAcr > 0 && item.month !== data.openConsumptionMonth;
                      if (!isClosed) return <td key={item.month} className="p-2">-</td>;
                      return <td key={item.month} className={item.difference >= 0 ? 'p-2 font-semibold text-emerald-600' : 'p-2 font-semibold text-red-600'}>{`${item.difference >= 0 ? '+' : ''}${formatCurrency(item.difference)}`}</td>;
                    })}<td className={differenceTotal >= 0 ? 'p-2 font-semibold text-emerald-600' : 'p-2 font-semibold text-red-600'}>{closedMonths.length ? `${differenceTotal >= 0 ? '+' : ''}${formatCurrency(differenceTotal)}` : '-'}</td></tr>
                  </tbody>
                </>;
              })()}
            </table>
          </div>
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