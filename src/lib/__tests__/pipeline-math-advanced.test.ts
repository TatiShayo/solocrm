import { describe, it, expect } from 'vitest';
import {
  roundToCents,
  clampProbability,
  totalPipeline,
  weightedPipeline,
  calculateDealRevenueForecast,
  calculateStageBreakdown,
  calculateWinRate,
  calculateAverageDealSize,
  calculateAverageSalesCycleDays,
  filterDeals,
  sortDeals,
  paginateItems,
} from '../pipeline-math';
import { Deal, PipelineStage } from '../db';

describe('Pipeline Math, Precision, Filtering & Forecasting Engine', () => {
  const mockStages: PipelineStage[] = [
    { id: 'stage-lead', pipeline_id: 'p-1', name: 'Lead', order_index: 0, probability: 10, color: '#3b82f6' },
    { id: 'stage-contacted', pipeline_id: 'p-1', name: 'Contacted', order_index: 1, probability: 30, color: '#a855f7' },
    { id: 'stage-proposal', pipeline_id: 'p-1', name: 'Proposal', order_index: 2, probability: 60, color: '#eab308' },
    { id: 'stage-negotiation', pipeline_id: 'p-1', name: 'Negotiation', order_index: 3, probability: 80, color: '#f97316' },
    { id: 'stage-won', pipeline_id: 'p-1', name: 'Won', order_index: 4, probability: 100, color: '#22c55e' },
    { id: 'stage-lost', pipeline_id: 'p-1', name: 'Lost', order_index: 5, probability: 0, color: '#ef4444' },
  ];

  const mockDeals: Deal[] = [
    {
      id: 'd-1',
      user_id: 'u-1',
      contact_id: 'c-1',
      pipeline_id: 'p-1',
      stage_id: 'stage-lead',
      title: 'Acme Starter License',
      value: 1200.50,
      close_date: '2026-08-30',
      probability: 10,
      notes: 'Initial outreach for 5 seats',
      won_at: null,
      lost_at: null,
      lost_reason: null,
    },
    {
      id: 'd-2',
      user_id: 'u-1',
      contact_id: 'c-2',
      pipeline_id: 'p-1',
      stage_id: 'stage-proposal',
      title: 'Globex Cloud Migration',
      value: 4500.00,
      close_date: '2026-09-15',
      probability: 60,
      notes: 'Proposal sent to IT team',
      won_at: null,
      lost_at: null,
      lost_reason: null,
    },
    {
      id: 'd-3',
      user_id: 'u-1',
      contact_id: 'c-3',
      pipeline_id: 'p-1',
      stage_id: 'stage-won',
      title: 'Hooli Expansion',
      value: 10000.00,
      close_date: '2026-07-01',
      probability: 100,
      notes: 'Closed contract',
      won_at: '2026-07-01T12:00:00.000Z',
      lost_at: null,
      lost_reason: null,
      ...({ created_at: '2026-06-01T12:00:00.000Z' } as any),
    },
    {
      id: 'd-4',
      user_id: 'u-1',
      contact_id: 'c-4',
      pipeline_id: 'p-1',
      stage_id: 'stage-lost',
      title: 'Southside Software',
      value: 2000.00,
      close_date: '2026-06-15',
      probability: 0,
      notes: 'Budget cuts',
      won_at: null,
      lost_at: '2026-06-15T12:00:00.000Z',
      lost_reason: 'Budget cuts',
    },
  ];

  describe('roundToCents & precision math', () => {
    it('rounds floating point additions cleanly', () => {
      expect(roundToCents(0.1 + 0.2)).toBe(0.3);
      expect(roundToCents(199.99 * 0.15)).toBe(30);
      expect(roundToCents(1234.567)).toBe(1234.57);
    });

    it('handles NaN and non-finite values safely', () => {
      expect(roundToCents(NaN)).toBe(0);
      expect(roundToCents(Infinity)).toBe(0);
      expect(roundToCents(-Infinity)).toBe(0);
    });
  });

  describe('calculateDealRevenueForecast', () => {
    it('accurately computes weighted forecast only for open deals', () => {
      // Open deals: d-1 ($1200.50 * 10% = $120.05) + d-2 ($4500.00 * 60% = $2700.00) = $2820.05
      const forecast = calculateDealRevenueForecast(mockDeals, mockStages);
      expect(forecast).toBe(2820.05);
    });

    it('falls back to stage probability when deal probability is null', () => {
      const dealsWithNullProb: Deal[] = [
        {
          ...mockDeals[0],
          probability: null,
        },
      ];
      const forecast = calculateDealRevenueForecast(dealsWithNullProb, mockStages);
      expect(forecast).toBe(120.05);
    });
  });

  describe('calculateStageBreakdown', () => {
    it('computes breakdown for every stage including count, value, weighted value', () => {
      const breakdown = calculateStageBreakdown(mockDeals, mockStages);
      expect(breakdown).toHaveLength(6);

      const leadStage = breakdown.find(s => s.stageId === 'stage-lead')!;
      expect(leadStage.dealCount).toBe(1);
      expect(leadStage.totalValue).toBe(1200.5);
      expect(leadStage.weightedValue).toBe(120.05);

      const contactedStage = breakdown.find(s => s.stageId === 'stage-contacted')!;
      expect(contactedStage.dealCount).toBe(0);
      expect(contactedStage.totalValue).toBe(0);
    });
  });

  describe('calculateWinRate', () => {
    it('calculates win rate percentage, won value, and lost value', () => {
      const metrics = calculateWinRate(mockDeals);
      expect(metrics.totalClosedCount).toBe(2);
      expect(metrics.wonCount).toBe(1);
      expect(metrics.lostCount).toBe(1);
      expect(metrics.winRatePct).toBe(50);
      expect(metrics.totalWonValue).toBe(10000);
      expect(metrics.totalLostValue).toBe(2000);
    });

    it('returns 0% when no deals have been closed', () => {
      const openOnly = mockDeals.slice(0, 2);
      const metrics = calculateWinRate(openOnly);
      expect(metrics.totalClosedCount).toBe(0);
      expect(metrics.winRatePct).toBe(0);
    });
  });

  describe('calculateAverageDealSize', () => {
    it('calculates average deal size for active/open deals', () => {
      const avg = calculateAverageDealSize(mockDeals, false);
      // (1200.50 + 4500.00 + 10000.00) / 3 = 5233.5
      expect(avg).toBe(5233.5);
    });

    it('calculates average deal size for won deals only', () => {
      const avgWon = calculateAverageDealSize(mockDeals, true);
      expect(avgWon).toBe(10000);
    });
  });

  describe('calculateAverageSalesCycleDays', () => {
    it('calculates average days from creation to close for won deals', () => {
      const avgDays = calculateAverageSalesCycleDays(mockDeals);
      expect(avgDays).toBe(30); // June 1 to July 1 = 30 days
    });

    it('returns 0 when no won deals with valid dates exist', () => {
      expect(calculateAverageSalesCycleDays(mockDeals.slice(0, 2))).toBe(0);
    });
  });

  describe('filterDeals', () => {
    it('filters deals by search query', () => {
      const results = filterDeals(mockDeals, { searchQuery: 'Migration' });
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('d-2');
    });

    it('filters deals by status (won, lost, open)', () => {
      const openDeals = filterDeals(mockDeals, { status: 'open' });
      expect(openDeals).toHaveLength(2);
      expect(openDeals.map(d => d.id)).toEqual(['d-1', 'd-2']);

      const wonDeals = filterDeals(mockDeals, { status: 'won' });
      expect(wonDeals).toHaveLength(1);
      expect(wonDeals[0].id).toBe('d-3');
    });

    it('filters deals by value range', () => {
      const highValue = filterDeals(mockDeals, { minValue: 4000 });
      expect(highValue.map(d => d.id)).toEqual(['d-2', 'd-3']);

      const bounded = filterDeals(mockDeals, { minValue: 1000, maxValue: 3000 });
      expect(bounded.map(d => d.id)).toEqual(['d-1', 'd-4']);
    });
  });

  describe('sortDeals', () => {
    it('sorts deals by value descending and ascending', () => {
      const sortedDesc = sortDeals(mockDeals, 'value_desc');
      expect(sortedDesc.map(d => d.id)).toEqual(['d-3', 'd-2', 'd-4', 'd-1']);

      const sortedAsc = sortDeals(mockDeals, 'value_asc');
      expect(sortedAsc.map(d => d.id)).toEqual(['d-1', 'd-4', 'd-2', 'd-3']);
    });

    it('sorts deals by title alphabetically', () => {
      const sortedTitle = sortDeals(mockDeals, 'title_asc');
      expect(sortedTitle[0].title).toBe('Acme Starter License');
      expect(sortedTitle[sortedTitle.length - 1].title).toBe('Southside Software');
    });
  });

  describe('paginateItems', () => {
    it('paginates items correctly', () => {
      const paged = paginateItems(mockDeals, 1, 2);
      expect(paged.page).toBe(1);
      expect(paged.pageSize).toBe(2);
      expect(paged.total).toBe(4);
      expect(paged.totalPages).toBe(2);
      expect(paged.items).toHaveLength(2);
      expect(paged.items[0].id).toBe('d-1');
      expect(paged.items[1].id).toBe('d-2');

      const page2 = paginateItems(mockDeals, 2, 2);
      expect(page2.items[0].id).toBe('d-3');
      expect(page2.items[1].id).toBe('d-4');
    });

    it('handles out of bounds page numbers gracefully', () => {
      const paged = paginateItems(mockDeals, 99, 2);
      expect(paged.items).toHaveLength(0);
      expect(paged.totalPages).toBe(2);
    });
  });
});
