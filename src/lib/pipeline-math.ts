import { Deal, PipelineStage } from './db';
import { buildStageIndex, isWonDeal, isLostDeal, type StageIndex } from './stage-identity';

export interface DealValue {
  value: number;
}

export interface OpenDeal extends DealValue {
  probability: number;
  status: "open";
}

/**
 * Rounds a number to exactly two decimal places (currency cents precision).
 * Eliminates JavaScript float rounding artifacts (e.g. 0.30000000000000004).
 */
export function roundToCents(value: number): number {
  if (isNaN(value) || !isFinite(value)) return 0;
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Clamps probability between 0 and 100, handling NaN / null / undefined.
 */
export function clampProbability(value: number | null | undefined): number {
  if (value === null || value === undefined || isNaN(value)) return 0;
  return Math.min(100, Math.max(0, Math.round(value)));
}

/**
 * Calculates sum of deal values with 2-decimal precision.
 */
export function totalPipeline(deals: DealValue[]): number {
  const sum = deals.reduce((acc, d) => acc + (d.value || 0), 0);
  return roundToCents(sum);
}

/**
 * Calculates weighted pipeline revenue forecast for open deals.
 */
export function weightedPipeline(deals: OpenDeal[]): number {
  const sum = deals.reduce((acc, d) => {
    const prob = clampProbability(d.probability);
    return acc + (d.value || 0) * (prob / 100);
  }, 0);
  return roundToCents(sum);
}

/**
 * Calculates percentage of weighted pipeline against total pipeline.
 */
export function weightedPct(weighted: number, total: number): number {
  if (!total || total <= 0) return 0;
  return Math.round((weighted / total) * 100);
}

/**
 * Advanced weighted revenue forecast for Deal entities.
 * Filters for open deals (won_at === null && lost_at === null),
 * and uses deal.probability if explicitly set, or falls back to stage probability.
 */
export function calculateDealRevenueForecast(deals: Deal[], stages: PipelineStage[]): number {
  const openDeals = deals.filter(d => d.won_at === null && d.lost_at === null);
  const sum = openDeals.reduce((acc, deal) => {
    let prob = deal.probability;
    if (prob === null || prob === undefined) {
      const stage = stages.find(s => s.id === deal.stage_id);
      prob = stage ? stage.probability : 0;
    }
    return acc + (deal.value || 0) * (clampProbability(prob) / 100);
  }, 0);
  return roundToCents(sum);
}

export interface StageBreakdownItem {
  stageId: string;
  stageName: string;
  orderIndex: number;
  probability: number;
  color: string | null;
  dealCount: number;
  totalValue: number;
  weightedValue: number;
}

/**
 * Calculates stage-by-stage metrics across a pipeline.
 */
export function calculateStageBreakdown(
  deals: Deal[],
  stages: PipelineStage[]
): StageBreakdownItem[] {
  const sortedStages = [...stages].sort((a, b) => a.order_index - b.order_index);

  return sortedStages.map(stage => {
    const stageDeals = deals.filter(d => d.stage_id === stage.id);
    const totalVal = roundToCents(stageDeals.reduce((sum, d) => sum + (d.value || 0), 0));
    const weightedVal = roundToCents(totalVal * (clampProbability(stage.probability) / 100));

    return {
      stageId: stage.id,
      stageName: stage.name,
      orderIndex: stage.order_index,
      probability: stage.probability,
      color: stage.color,
      dealCount: stageDeals.length,
      totalValue: totalVal,
      weightedValue: weightedVal,
    };
  });
}

export interface WinRateMetrics {
  totalClosedCount: number;
  wonCount: number;
  lostCount: number;
  winRatePct: number;
  totalWonValue: number;
  totalLostValue: number;
}

/**
 * Calculates win rate and won/lost values for closed deals.
 */
export function calculateWinRate(deals: Deal[], stageIndex?: StageIndex): WinRateMetrics {
  const wonDeals = deals.filter((d) => isWonDeal(d, stageIndex));
  const lostDeals = deals.filter((d) => isLostDeal(d, stageIndex));
  const totalClosed = wonDeals.length + lostDeals.length;

  const totalWonValue = roundToCents(wonDeals.reduce((acc, d) => acc + (d.value || 0), 0));
  const totalLostValue = roundToCents(lostDeals.reduce((acc, d) => acc + (d.value || 0), 0));

  const winRatePct = totalClosed > 0 ? Math.round((wonDeals.length / totalClosed) * 100) : 0;

  return {
    totalClosedCount: totalClosed,
    wonCount: wonDeals.length,
    lostCount: lostDeals.length,
    winRatePct,
    totalWonValue,
    totalLostValue,
  };
}

/**
 * Calculates the average deal size across open and won deals (or all deals).
 */
export function calculateAverageDealSize(
  deals: Deal[],
  onlyWon: boolean = false,
  stageIndex?: StageIndex
): number {
  const targetDeals = onlyWon
    ? deals.filter((d) => isWonDeal(d, stageIndex))
    : deals.filter((d) => !isLostDeal(d, stageIndex));

  if (targetDeals.length === 0) return 0;
  const sum = targetDeals.reduce((acc, d) => acc + (d.value || 0), 0);
  return roundToCents(sum / targetDeals.length);
}

/**
 * Calculates the average sales cycle in days for won deals.
 */
export function calculateAverageSalesCycleDays(deals: Deal[], stageIndex?: StageIndex): number {
  const wonWithDates = deals.filter(
    d => isWonDeal(d, stageIndex) && d.won_at && (d as any).created_at
  );

  if (wonWithDates.length === 0) return 0;

  const totalDays = wonWithDates.reduce((acc, deal) => {
    const created = new Date((deal as any).created_at).getTime();
    const won = new Date(deal.won_at!).getTime();
    const diffDays = Math.max(0, (won - created) / (1000 * 60 * 60 * 24));
    return acc + diffDays;
  }, 0);

  return Math.round(totalDays / wonWithDates.length);
}

export type DealSortKey =
  | 'value_desc'
  | 'value_asc'
  | 'title_asc'
  | 'title_desc'
  | 'close_date_asc'
  | 'close_date_desc'
  | 'created_at_desc'
  | 'created_at_asc'
  | 'probability_desc'
  | 'probability_asc';

export interface DealFilterOptions {
  searchQuery?: string;
  stageId?: string;
  status?: 'open' | 'won' | 'lost' | 'all';
  minValue?: number;
  maxValue?: number;
  contactId?: string;
  closeDateFrom?: string;
  closeDateTo?: string;
}

/**
 * Filters a list of deals according to criteria.
 */
export function filterDeals(
  deals: Deal[],
  filters: DealFilterOptions,
  stageIndex?: StageIndex
): Deal[] {
  return deals.filter(deal => {
    // 1. Search Query (title, notes)
    if (filters.searchQuery && filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase().trim();
      const titleMatch = (deal.title || '').toLowerCase().includes(q);
      const notesMatch = (deal.notes || '').toLowerCase().includes(q);
      if (!titleMatch && !notesMatch) return false;
    }

    // 2. Stage Filter
    if (filters.stageId && filters.stageId !== 'all') {
      if (deal.stage_id !== filters.stageId) return false;
    }

    // 3. Status Filter
    if (filters.status && filters.status !== 'all') {
      const isWon = isWonDeal(deal, stageIndex);
      const isLost = isLostDeal(deal, stageIndex);
      const isOpen = !isWon && !isLost;

      if (filters.status === 'open' && !isOpen) return false;
      if (filters.status === 'won' && !isWon) return false;
      if (filters.status === 'lost' && !isLost) return false;
    }

    // 4. Contact Filter
    if (filters.contactId) {
      if (deal.contact_id !== filters.contactId) return false;
    }

    // 5. Value Range
    if (filters.minValue !== undefined && deal.value < filters.minValue) return false;
    if (filters.maxValue !== undefined && deal.value > filters.maxValue) return false;

    // 6. Close Date Range
    if (filters.closeDateFrom && deal.close_date && deal.close_date < filters.closeDateFrom) return false;
    if (filters.closeDateTo && deal.close_date && deal.close_date > filters.closeDateTo) return false;

    return true;
  });
}

/**
 * Sorts a list of deals.
 */
export function sortDeals(deals: Deal[], sortBy: DealSortKey = 'created_at_desc'): Deal[] {
  const result = [...deals];

  return result.sort((a, b) => {
    switch (sortBy) {
      case 'value_desc':
        return (b.value || 0) - (a.value || 0);
      case 'value_asc':
        return (a.value || 0) - (b.value || 0);
      case 'title_asc':
        return (a.title || '').localeCompare(b.title || '');
      case 'title_desc':
        return (b.title || '').localeCompare(a.title || '');
      case 'probability_desc':
        return (b.probability || 0) - (a.probability || 0);
      case 'probability_asc':
        return (a.probability || 0) - (b.probability || 0);
      case 'close_date_asc':
        if (!a.close_date) return 1;
        if (!b.close_date) return -1;
        return a.close_date.localeCompare(b.close_date);
      case 'close_date_desc':
        if (!a.close_date) return 1;
        if (!b.close_date) return -1;
        return b.close_date.localeCompare(a.close_date);
      case 'created_at_asc':
        return new Date((a as any).created_at || 0).getTime() - new Date((b as any).created_at || 0).getTime();
      case 'created_at_desc':
      default:
        return new Date((b as any).created_at || 0).getTime() - new Date((a as any).created_at || 0).getTime();
    }
  });
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Paginates an array of items.
 */
export function paginateItems<T>(items: T[], page: number = 1, pageSize: number = 10): PaginatedResult<T> {
  const validPage = Math.max(1, Math.floor(page || 1));
  const validPageSize = Math.max(1, Math.floor(pageSize || 10));
  const total = items.length;
  const totalPages = Math.max(1, Math.ceil(total / validPageSize));
  const startIndex = (validPage - 1) * validPageSize;
  const pageItems = items.slice(startIndex, startIndex + validPageSize);

  return {
    items: pageItems,
    total,
    page: validPage,
    pageSize: validPageSize,
    totalPages,
  };
}
