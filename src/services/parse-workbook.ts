import * as XLSX from 'xlsx';
import type { DashboardSummary } from '../types/dashboard';
import { cleanText, normalizeStatus, toNumber } from '../utils/strings';
import { formatDate, normalizeDate, isWithinDays, isPastDue } from '../utils/date';
import { calculateCommittedOpportunityPipeline, calculateUncommittedOpportunityPipeline } from '../utils/pipeline';

const SHEET_NAMES = [
  'Dashboard Executivo',
  'Account Overview',
  'CSU_Projects',
  'CSU_Projetos',
  'CSU_Milestones',
  'ATU_STU',
  'Consumption',
  'Consumo',
  'ACR',
  'Executive_Summary',
  'History',
  'Historico',
  'Hisotico',
  'Listas',
];

const getSheet = (workbook: XLSX.WorkBook, sheetName: string) => {
  if (workbook.Sheets[sheetName]) return workbook.Sheets[sheetName] ?? null;
  const match = Object.entries(workbook.Sheets).find(([name]) => name.trim() === sheetName.trim());
  return match ? match[1] : null;
};

const normalizeHeader = (value: string) => String(value ?? '').trim().replace(/\s+/g, ' ').toLowerCase();

const sheetToRows = (sheet: XLSX.WorkSheet | null, raw = false): Record<string, unknown>[] => {
  if (!sheet) return [];
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, raw, blankrows: false, defval: '' }) as unknown[][];
  if (!matrix.length) return [];

  const [headerRow, ...dataRows] = matrix;
  const headers = (headerRow as unknown[]).map((cell) => String(cell ?? '').trim());

  return dataRows.map((row) => {
    const mapped: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      mapped[header] = row[index] ?? '';
    });
    return mapped;
  });
};

const sheetToRowsAtHeader = (sheet: XLSX.WorkSheet | null, headerMarker: string, fallbackIndex: number): Record<string, unknown>[] => {
  if (!sheet) return [];
  const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, blankrows: false, defval: '' }) as unknown[][];
  const detectedIndex = matrix.findIndex((row) => row.some((cell) => normalizeHeader(String(cell ?? '')) === normalizeHeader(headerMarker)));
  const headerIndex = detectedIndex >= 0 ? detectedIndex : fallbackIndex;
  const headers = (matrix[headerIndex] ?? []).map((cell) => String(cell ?? '').trim());
  return matrix.slice(headerIndex + 1).map((row) => Object.fromEntries(headers.map((header, index) => [header, row[index] ?? ''])));
};

const getColumnHyperlinks = (sheet: XLSX.WorkSheet | null, headerMarker: string, columnHeader: string) => {
  const links = new Map<string, string>();
  if (!sheet?.['!ref']) return links;
  const range = XLSX.utils.decode_range(sheet['!ref']);
  let headerRow = -1;
  for (let row = range.s.r; row <= range.e.r && headerRow < 0; row += 1) {
    for (let column = range.s.c; column <= range.e.c; column += 1) {
      const value = sheet[XLSX.utils.encode_cell({ r: row, c: column })]?.v;
      if (normalizeHeader(String(value ?? '')) === normalizeHeader(headerMarker)) {
        headerRow = row;
        break;
      }
    }
  }
  if (headerRow < 0) return links;

  let targetColumn = -1;
  for (let column = range.s.c; column <= range.e.c; column += 1) {
    const value = sheet[XLSX.utils.encode_cell({ r: headerRow, c: column })]?.v;
    if (normalizeHeader(String(value ?? '')) === normalizeHeader(columnHeader)) {
      targetColumn = column;
      break;
    }
  }
  if (targetColumn < 0) return links;

  for (let row = headerRow + 1; row <= range.e.r; row += 1) {
    const cell = sheet[XLSX.utils.encode_cell({ r: row, c: targetColumn })];
    const value = String(cell?.v ?? '').trim();
    const target = cell?.l?.Target?.replace(/&amp;/g, '&');
    if (value && target) links.set(value, target);
  }
  return links;
};

const findHeader = (row: Record<string, unknown>, labelCandidates: string[]): string | undefined => {
  const keys = Object.keys(row);
  for (const candidate of labelCandidates) {
    const normalized = normalizeHeader(candidate);
    const match = keys.find((key) => normalizeHeader(key) === normalized || normalizeHeader(key).includes(normalized));
    if (match) return match;
  }
  return undefined;
};

const getColumnValue = (row: Record<string, unknown>, candidates: string[]): string => {
  const key = findHeader(row, candidates);
  if (!key) return 'Não informado';
  return cleanText(row[key]);
};

const getValueFor = (row: Record<string, unknown>, candidates: string[]) => {
  const key = findHeader(row, candidates);
  return key ? row[key] : undefined;
};

const getExactText = (row: Record<string, unknown>, candidates: string[]) => {
  const value = getValueFor(row, candidates);
  return value == null ? '' : String(value).trim();
};

const isCommittedValue = (value: unknown) => ['committed', 'commited'].includes(cleanText(value).toLowerCase());

const parseContractValue = (value: string) => {
  const normalized = value.toLowerCase().replace(',', '.').trim();
  const amount = Number(normalized.replace(/[^0-9.]/g, ''));
  if (!Number.isFinite(amount)) return 0;
  if (normalized.includes('m')) return amount * 1_000_000;
  if (normalized.includes('k')) return amount * 1_000;
  return amount;
};

const parseYears = (value: string) => {
  const years = Number(value.replace(',', '.').replace(/[^0-9.]/g, ''));
  return Number.isFinite(years) && years > 0 ? years : 0;
};

export const parseWorkbook = (input: ArrayBuffer | Uint8Array): DashboardSummary => {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const workbook = XLSX.read(bytes, { type: 'array' });
  const relevantSheets = SHEET_NAMES.filter((sheetName) => workbook.Sheets[sheetName]);

  if (!relevantSheets.length) {
    throw new Error('No relevant workbook sheets found.');
  }

  const executiveSheet = getSheet(workbook, 'Dashboard Executivo');
  const accountOverviewSheet = getSheet(workbook, 'Account Overview');
  const csuProjectsSheet = getSheet(workbook, 'CSU_Projects') ?? getSheet(workbook, 'CSU_Projetos');
  const csuMilestonesSheet = getSheet(workbook, 'CSU_Milestones');
  const atuSheet = getSheet(workbook, 'ATU_STU');
  const consumptionSheet = getSheet(workbook, 'Consumption') ?? getSheet(workbook, 'Consumo') ?? getSheet(workbook, 'ACR');
  const historySheet = getSheet(workbook, 'Executive_Summary') ?? getSheet(workbook, 'History') ?? getSheet(workbook, 'Historico') ?? getSheet(workbook, 'Hisotico');
  const listsSheet = getSheet(workbook, 'Listas');

  const executiveRows = sheetToRows(executiveSheet);
  const historyRows = sheetToRowsAtHeader(historySheet, 'Data da sessao', 1);
  const csuProjectRows = sheetToRowsAtHeader(csuProjectsSheet, 'Vertical', 1);
  const csuMilestoneRows = sheetToRowsAtHeader(csuMilestonesSheet, 'Milestone', 1);
  const csuMilestoneLinks = getColumnHyperlinks(csuMilestonesSheet, 'Milestone', 'Milestone ID');
  const atuRows = sheetToRowsAtHeader(atuSheet, 'Vertical', 1);
  const atuOpportunityLinks = getColumnHyperlinks(atuSheet, 'Vertical', 'Opportunity ID');
  const consumptionRows = sheetToRows(consumptionSheet, true);
  const listRows = sheetToRows(listsSheet);

  const extractHeaderRow = (rows: Record<string, unknown>[]) => rows[0] ?? {};
  const atuOpportunityDetails = new Map<string, { name: string; vertical: string }>();
  atuRows.forEach((row) => {
    const opportunityId = getExactText(row, ['Opportunity ID']);
    if (opportunityId) {
      atuOpportunityDetails.set(opportunityId, { name: getExactText(row, ['Opportunity']), vertical: getExactText(row, ['Vertical']) });
    }
  });

  const milestoneData = csuMilestoneRows.map((row, index) => {
    const milestoneId = getExactText(row, ['Milestone ID']);
    const relatedOpportunity = atuOpportunityDetails.get(milestoneId);
    const opportunityId = milestoneId;
    const opportunityName = relatedOpportunity?.name ?? '';
    const vertical = relatedOpportunity?.vertical ?? '';
    const milestoneTitle = getExactText(row, ['Milestone']);
    const workload = toNumber(getValueFor(row, ['Workload', 'workload']));
    const customerCommitment = getExactText(row, ['Customer Commitment']);
    const currentOwnership = '';
    const owner = getExactText(row, ['Owner']);
    const status = normalizeStatus(getValueFor(row, ['Milestone Status']));
    const estimatedDateText = getExactText(row, ['Estimated Date']);
    const estimatedDate = normalizeDate(estimatedDateText);
    const estimatedMonthlyUsage = toNumber(getValueFor(row, ['Est. Monthly Usage']));
    const category = getExactText(row, ['Categoria']);
    const handoffCondition = getExactText(row, ['Handoff para CSU']);
    const nextAction = getExactText(row, ['Proxima acao']);
    const nextReviewDate = undefined;
    const risk = getExactText(row, ['Risco / Bloqueio']);
    const lastUpdated = normalizeDate(getValueFor(row, ['Ultima atualizacao', 'Last updated'])) ?? cleanText(getValueFor(row, ['Ultima atualizacao', 'Last updated']));
    const isCommitted = isCommittedValue(customerCommitment);

    return {
      milestoneId: milestoneId || `MS-${index + 1}`,
      milestoneUrl: csuMilestoneLinks.get(milestoneId) || undefined,
      opportunityId,
      opportunityName,
      vertical: vertical || undefined,
      title: milestoneTitle,
      status: status as any,
      owner,
      currentOwnership,
      estimatedDate,
      estimatedDateText,
      workload,
      customerCommitment: customerCommitment || undefined,
      estimatedMonthlyUsage: estimatedMonthlyUsage || undefined,
      category: category || undefined,
      handoffCondition: handoffCondition || undefined,
      nextAction: nextAction || undefined,
      nextReviewDate,
      risk: risk || undefined,
      lastUpdated,
      isCommitted,
    };
  }).filter((item) => item.title && item.title !== '0');

  const decisionData = listRows.map((row) => ({
    id: cleanText(getValueFor(row, ['Decision ID', 'Decisao ID'])),
    title: cleanText(getValueFor(row, ['Decision', 'Decisao', 'Decision Title'])),
    decisionDate: normalizeDate(getValueFor(row, ['Date', 'Data', 'Decision Date'])),
    owner: cleanText(getValueFor(row, ['Owner', 'Responsavel'])),
    status: normalizeStatus(getValueFor(row, ['Status', 'status'])),
    relatedOpportunityId: cleanText(getValueFor(row, ['Opportunity ID', 'OpportunityId'])),
  })).filter((item) => item.title !== 'Não informado');

  const riskData = listRows.map((row) => ({
    id: cleanText(getValueFor(row, ['Risk ID', 'Id do risco', 'Risk Id'])),
    title: cleanText(getValueFor(row, ['Risk', 'Risco'])),
    opportunityId: cleanText(getValueFor(row, ['Opportunity ID', 'OpportunityId'])),
    severity: cleanText(getValueFor(row, ['Severity', 'Severidade'])),
    status: normalizeStatus(getValueFor(row, ['Status', 'status'])),
    owner: cleanText(getValueFor(row, ['Owner', 'Responsavel'])),
  })).filter((item) => item.title !== 'Não informado');

  const splitHistoryValues = (value: unknown) => String(value ?? '').split(';').map((item) => cleanText(item)).filter((item) => item && item !== 'Não informado');
  const historyData = historyRows.map((row, index) => ({
    id: getExactText(row, ['Session ID', 'ID da sessao']) || `HIST-${index + 1}`,
    sessionDate: normalizeDate(getValueFor(row, ['Session date', 'Data da sessao', 'Date'])) ?? cleanText(getValueFor(row, ['Session date', 'Data da sessao', 'Date'])),
    summary: cleanText(getValueFor(row, ['Resumo Executivp', 'Resumo Executivo', 'Summary', 'Resumo'])),
    actions: splitHistoryValues(getValueFor(row, ['Actions', 'Acoes'])),
    decisions: splitHistoryValues(getValueFor(row, ['Decisions', 'Decisoes'])),
    risks: splitHistoryValues(getValueFor(row, ['Risks', 'Riscos'])),
    milestonesReviewed: splitHistoryValues(getValueFor(row, ['Milestones reviewed', 'Milestones revisados'])),
    successStories: splitHistoryValues(getValueFor(row, ['Success stories', 'Historias de sucesso'])),
    indicators: {},
  })).filter((item) => item.summary !== 'Não informado');

  const latestHistoryRow = historyRows
    .map((row) => ({
      row,
      sessionDate: normalizeDate(getValueFor(row, ['Session date', 'Data da sessao', 'Date'])),
    }))
    .filter((item): item is { row: Record<string, unknown>; sessionDate: string } => Boolean(item.sessionDate))
    .sort((left, right) => new Date(right.sessionDate).getTime() - new Date(left.sessionDate).getTime())[0];
  const latestExecutiveSummary = latestHistoryRow
    ? cleanText(getValueFor(latestHistoryRow.row, ['Resumo Executivp', 'Resumo executivo', 'Resumo Executivo']))
    : 'Não informado';

  const accountMatrix = accountOverviewSheet ? XLSX.utils.sheet_to_json(accountOverviewSheet, { header: 1, raw: false, blankrows: false, defval: '' }) as unknown[][] : [];
  const sectionIndex = (label: string) => accountMatrix.findIndex((row) => String(row[0] ?? '').trim().toLowerCase() === label.toLowerCase());
  const general: Record<string, string> = {};
  const generalStart = sectionIndex('INFORMACOES GERAIS');
  accountMatrix.slice(generalStart + 1, generalStart + 6).forEach((row) => { if (row[0]) general[String(row[0])] = String(row[1] ?? '').trim(); });
  const sectionRows = (label: string, nextLabels: string[]) => {
    const start = sectionIndex(label);
    if (start < 0) return [];
    const end = accountMatrix.findIndex((row, index) => index > start && nextLabels.includes(String(row[0] ?? '').trim().toUpperCase()));
    const header = (accountMatrix[start + 1] ?? []).map((cell) => String(cell ?? '').trim());
    return accountMatrix.slice(start + 2, end < 0 ? accountMatrix.length : end).filter((row) => row.some(Boolean)).map((row) => Object.fromEntries(header.map((key, index) => [key, String(row[index] ?? '').trim()])));
  };
  const accountOverview = {
    general,
    accountTeam: sectionRows('TIME DA CONTA', ['CONTRATOS', 'SUCCESS PROGRAMS', 'STAKEHOLDERS CLIENTE']),
    contracts: sectionRows('CONTRATOS', ['SUCCESS PROGRAMS', 'STAKEHOLDERS CLIENTE']),
    successPrograms: sectionRows('SUCCESS PROGRAMS', ['STAKEHOLDERS CLIENTE']),
    priorities: [],
  };

  const parseContractHours = (value: string) => {
    const match = value.match(/([\d.,]+)\s*horas?/i);
    if (!match) return 0;
    const parsed = Number(match[1].replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(parsed) ? parsed : 0;
  };

  const normalizePackageName = (value: string) => value.replace(/\s+/g, ' ').trim();

  const hoursContracts = accountOverview.contracts
    .map((contract) => ({
      type: normalizePackageName(contract['Tipo de Contrato'] || ''),
      description: contract['Descricao / Escopo'] || '',
      hours: parseContractHours(contract['Quantidade / Valor'] || ''),
    }))
    .filter((item) => item.hours > 0);

  const totalHoursSold = hoursContracts.reduce((sum, item) => sum + item.hours, 0);

  const csuPackageMap = new Map<string, { name: string; description: string; soldHours: number; hoursConsumed: number; hoursPlanned: number; projects: Array<{ name: string; dispatch: string; dispatchUrl: string; endDate: string; csa: string; planned: number; hours: number; stakeholder: string; status: string }> }>();
  hoursContracts.forEach((contract) => {
    const current = csuPackageMap.get(contract.type) ?? { name: contract.type, description: '', soldHours: 0, hoursConsumed: 0, hoursPlanned: 0, projects: [] };
    current.description = contract.description;
    current.soldHours += contract.hours;
    csuPackageMap.set(contract.type, current);
  });
  csuProjectRows.forEach((row) => {
    const packageName = normalizePackageName(getExactText(row, ['Pacote']));
    if (!packageName) return;
    const dispatch = getExactText(row, ['Dispatch']);
    const hours = toNumber(getValueFor(row, ['Horas']));
    const planned = toNumber(getValueFor(row, ['Planejado']));
    const current = csuPackageMap.get(packageName) ?? { name: packageName, description: '', soldHours: 0, hoursConsumed: 0, hoursPlanned: 0, projects: [] };
    current.hoursConsumed += hours;
    current.hoursPlanned += planned;
    current.projects.push({
      name: getExactText(row, ['Projeto']),
      dispatch,
      dispatchUrl: dispatch ? `https://esxp.microsoft.com/#/supportdelivery/requestdetails/${dispatch}` : '',
      endDate: getExactText(row, ['End Date']),
      csa: getExactText(row, ['CSA']),
      planned,
      hours,
      stakeholder: getExactText(row, ['Stakeholder']),
      status: getExactText(row, ['Staus', 'Status']),
    });
    csuPackageMap.set(packageName, current);
  });
  const csuPackages = Array.from(csuPackageMap.values());

  const csuVerticalMap = new Map<string, { name: string; activeProjects: number; opportunityCount: number; hoursConsumed: number; hoursPlanned: number }>();
  csuProjectRows.forEach((row) => {
    const verticalName = getExactText(row, ['Vertical']);
    if (!verticalName) return;
    const current = csuVerticalMap.get(verticalName) ?? { name: verticalName, activeProjects: 0, opportunityCount: 0, hoursConsumed: 0, hoursPlanned: 0 };
    const opportunityValue = getExactText(row, ['Oportunidade']);
    current.activeProjects += 1;
    if (opportunityValue && opportunityValue !== '-') current.opportunityCount += 1;
    current.hoursConsumed += toNumber(getValueFor(row, ['Horas']));
    current.hoursPlanned += toNumber(getValueFor(row, ['Planejado']));
    csuVerticalMap.set(verticalName, current);
  });
  const csuVerticalSummary = Array.from(csuVerticalMap.values());

  const atuOpportunityRows = atuRows.map((row) => {
    const opportunityId = getExactText(row, ['Opportunity ID']);
    return { opportunityId, opportunityUrl: atuOpportunityLinks.get(opportunityId) ?? '', opportunityName: getExactText(row, ['Opportunity']), vertical: getExactText(row, ['Vertical']), stage: getExactText(row, ['Opportunity Stage']), customerCommitment: getExactText(row, ['Customer Commitment']), owner: getExactText(row, ['Owner']), consumedRecurring: toNumber(getValueFor(row, ['Consumed Recurring'])), handoff: getExactText(row, ['Handoff para CSU']), risk: getExactText(row, ['Risco / Bloqueio']) };
  }).filter((item) => item.opportunityId || item.opportunityName);
  const opportunities = atuOpportunityRows.map((opportunity, index) => ({
    opportunityId: opportunity.opportunityId || `OP-${index + 1}`,
    name: opportunity.opportunityName,
    stage: opportunity.stage,
    vertical: opportunity.vertical,
    status: '',
    customerCommitment: opportunity.customerCommitment,
    committed: isCommittedValue(opportunity.customerCommitment),
    monthlyUsage: opportunity.consumedRecurring,
    ownership: opportunity.owner,
    handoff: opportunity.handoff,
    risk: opportunity.risk,
    milestones: [],
    lastUpdated: '',
  })).filter((item) => item.name);
  const atuOpportunities = atuOpportunityRows.map((opportunity) => ({ opportunityId: opportunity.opportunityId, opportunityUrl: opportunity.opportunityUrl, opportunityName: opportunity.opportunityName, vertical: opportunity.vertical, stage: opportunity.stage, ownership: '', owner: opportunity.owner, handoff: opportunity.handoff, risk: opportunity.risk, nextAction: '', customerCommitment: opportunity.customerCommitment, milestoneCount: 0, committedValue: isCommittedValue(opportunity.customerCommitment) ? opportunity.consumedRecurring : 0, uncommittedValue: isCommittedValue(opportunity.customerCommitment) ? 0 : opportunity.consumedRecurring, pipelineTotal: opportunity.consumedRecurring, nextMilestone: '', nextMilestoneDate: '', overallStatus: '', milestones: [] }));
  const pipelineInputs = atuOpportunityRows.map(({ opportunityId, vertical, customerCommitment, consumedRecurring }) => ({ opportunityId, vertical, customerCommitment, consumedRecurring }));
  const committedValue = calculateCommittedOpportunityPipeline(pipelineInputs);
  const uncommittedValue = calculateUncommittedOpportunityPipeline(pipelineInputs);
  const pipelineSummary = { committedValue, uncommittedValue, totalValue: committedValue + uncommittedValue, committedMilestones: 0, uncommittedMilestones: 0, committedOpportunities: pipelineInputs.filter((item) => isCommittedValue(item.customerCommitment)).length, uncommittedOpportunities: pipelineInputs.filter((item) => !isCommittedValue(item.customerCommitment)).length, byVertical: {}, byStatus: {} };
  const consumption = Array.from({ length: 12 }, (_, index) => {
    const date = new Date(Date.UTC(2026, 6 + index, 1));
    const monthKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    return {
      month: date.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' }),
      value: consumptionRows.filter((row) => {
        const normalized = normalizeDate(getValueFor(row, ['Date']));
        return normalized?.slice(0, 7) === monthKey;
      }).reduce((sum, row) => sum + toNumber(getValueFor(row, ['ACR'])), 0),
    };
  });
  const dailyConsumption = consumption.map((item, index) => {
    const date = new Date(Date.UTC(2026, 6 + index, 1));
    const monthKey = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
    return {
      month: item.month,
      value: consumptionRows.filter((row) => normalizeDate(getValueFor(row, ['Date']))?.slice(0, 7) === monthKey).reduce((sum, row) => sum + toNumber(getValueFor(row, ['Avrg Daily'])), 0),
    };
  });
  const maccContract = accountOverview.contracts.find((contract) => contract['Tipo de Contrato'].trim().toLowerCase() === 'macc');
  const maccTotal = maccContract ? parseContractValue(maccContract['Quantidade / Valor']) : 0;
  const maccDurationYears = parseYears(maccContract?.Vigencia ?? '');
  const maccMonthlyExpected = maccTotal > 0 && maccDurationYears > 0 ? maccTotal / maccDurationYears / 12 : 0;
  const maccComparison = consumption.map((item) => ({
    month: item.month,
    expectedMonthly: maccMonthlyExpected,
    actualAcr: item.value,
    difference: item.value - maccMonthlyExpected,
  }));

  const groupedOpportunities = opportunities.map((opportunity) => {
    const relatedMilestones = milestoneData.filter((item) => item.opportunityId === opportunity.opportunityId || item.opportunityName === opportunity.name);
    return { ...opportunity, milestones: relatedMilestones };
  });

  const kpis = {
    openInitiatives: 0,
    activeProjects: csuVerticalSummary.reduce((sum, vertical) => sum + vertical.activeProjects, 0),
    activeOpportunities: new Set(
      atuOpportunityRows
        .map((opportunity) => opportunity.opportunityName)
        .filter((item) => item && item !== 'Não informado')
    ).size,
    milestonesTracked: milestoneData.length,
    milestonesCommitted: csuMilestoneRows.filter((row) => {
      const value = cleanText(getValueFor(row, ['Customer Commitment', 'Customer commitment', 'Comprometimento cliente']));
      return ['committed', 'commited'].includes(String(value).toLowerCase());
    }).length,
    milestonesUncommitted: csuMilestoneRows.filter((row) => {
      const value = cleanText(getValueFor(row, ['Customer Commitment', 'Customer commitment', 'Comprometimento cliente']));
      return ['uncommitted', 'uncommited'].includes(String(value).toLowerCase());
    }).length,
    milestonesAtRiskOrBlocked: csuMilestoneRows.filter((row) => {
      const value = cleanText(getValueFor(row, ['Milestone Status', 'Status', 'status']));
      return ['At Risk', 'Blocked'].includes(String(value));
    }).length,
    hoursConsumed: csuVerticalSummary.reduce((sum, vertical) => sum + vertical.hoursConsumed, 0),
    hoursPlanned: csuVerticalSummary.reduce((sum, vertical) => sum + vertical.hoursPlanned, 0),
  };

  const executiveSummary = latestExecutiveSummary;

  const summary: DashboardSummary = {
    lastUpdated: new Date().toISOString(),
    lastSessionDate: latestHistoryRow?.sessionDate ?? 'Não informado',
    executiveSummary,
    kpis,
    opportunities: groupedOpportunities,
    milestones: milestoneData,
    decisions: decisionData,
    risks: riskData,
    history: historyData,
    accountOverview,
    totalHoursSold,
    csuPackages,
    csuVerticalSummary,
    atuOpportunities,
    pipelineSummary,
    consumption,
    dailyConsumption,
    maccComparison,
    maccTotal,
  };

  return summary;
};
