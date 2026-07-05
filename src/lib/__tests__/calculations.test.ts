import { describe, it, expect } from 'vitest';
import { calculateRevenueForecast } from '../calculations';
import { Deal, PipelineStage } from '../db';

describe('Revenue Forecast Calculations', () => {
  const mockStages: PipelineStage[] = [
    { id: 'stage-lead', pipeline_id: 'pipeline-sales', name: 'Lead', order_index: 0, probability: 10, color: null },
    { id: 'stage-contacted', pipeline_id: 'pipeline-sales', name: 'Contacted', order_index: 1, probability: 30, color: null },
    { id: 'stage-proposal', pipeline_id: 'pipeline-sales', name: 'Proposal', order_index: 2, probability: 60, color: null },
    { id: 'stage-negotiation', pipeline_id: 'pipeline-sales', name: 'Negotiation', order_index: 3, probability: 80, color: null },
    { id: 'stage-won', pipeline_id: 'pipeline-sales', name: 'Won', order_index: 4, probability: 100, color: null },
    { id: 'stage-lost', pipeline_id: 'pipeline-sales', name: 'Lost', order_index: 5, probability: 0, color: null }
  ];

  it('should return 0 when there are no deals', () => {
    expect(calculateRevenueForecast([], mockStages)).toBe(0);
  });

  it('should calculate weighted forecast correctly for open deals', () => {
    const deals: Deal[] = [
      {
        id: 'deal-1',
        user_id: 'user-1',
        contact_id: null,
        pipeline_id: 'pipeline-sales',
        stage_id: 'stage-lead',
        title: 'Lead Deal',
        value: 1000,
        close_date: null,
        probability: 10,
        notes: null,
        won_at: null,
        lost_at: null,
        lost_reason: null
      },
      {
        id: 'deal-2',
        user_id: 'user-1',
        contact_id: null,
        pipeline_id: 'pipeline-sales',
        stage_id: 'stage-proposal',
        title: 'Proposal Deal',
        value: 5000,
        close_date: null,
        probability: 60,
        notes: null,
        won_at: null,
        lost_at: null,
        lost_reason: null
      }
    ];

    // Expected: (1000 * 10/100) + (5000 * 60/100) = 100 + 3000 = 3100
    expect(calculateRevenueForecast(deals, mockStages)).toBe(3100);
  });

  it('should return 0 for Won and Lost deals as they are not open', () => {
    const deals: Deal[] = [
      {
        id: 'deal-won',
        user_id: 'user-1',
        contact_id: null,
        pipeline_id: 'pipeline-sales',
        stage_id: 'stage-won',
        title: 'Won Deal',
        value: 10000,
        close_date: null,
        probability: 100,
        notes: null,
        won_at: '2026-06-30T00:00:00Z',
        lost_at: null,
        lost_reason: null
      },
      {
        id: 'deal-lost',
        user_id: 'user-1',
        contact_id: null,
        pipeline_id: 'pipeline-sales',
        stage_id: 'stage-lost',
        title: 'Lost Deal',
        value: 5000,
        close_date: null,
        probability: 0,
        notes: null,
        won_at: null,
        lost_at: '2026-06-30T00:00:00Z',
        lost_reason: 'Price'
      }
    ];

    expect(calculateRevenueForecast(deals, mockStages)).toBe(0);
  });

  it('should handle open deals mixed with won/lost deals correctly', () => {
    const deals: Deal[] = [
      {
        id: 'deal-1',
        user_id: 'user-1',
        contact_id: null,
        pipeline_id: 'pipeline-sales',
        stage_id: 'stage-negotiation',
        title: 'Negotiation Deal',
        value: 2000,
        close_date: null,
        probability: 80,
        notes: null,
        won_at: null,
        lost_at: null,
        lost_reason: null
      },
      {
        id: 'deal-won',
        user_id: 'user-1',
        contact_id: null,
        pipeline_id: 'pipeline-sales',
        stage_id: 'stage-won',
        title: 'Won Deal',
        value: 10000,
        close_date: null,
        probability: 100,
        notes: null,
        won_at: '2026-06-30T00:00:00Z',
        lost_at: null,
        lost_reason: null
      },
      {
        id: 'deal-lost',
        user_id: 'user-1',
        contact_id: null,
        pipeline_id: 'pipeline-sales',
        stage_id: 'stage-lost',
        title: 'Lost Deal',
        value: 5000,
        close_date: null,
        probability: 0,
        notes: null,
        won_at: null,
        lost_at: '2026-06-30T00:00:00Z',
        lost_reason: 'Competitor'
      }
    ];

    // Expected: 2000 * 80/100 = 1600 (won and lost are excluded)
    expect(calculateRevenueForecast(deals, mockStages)).toBe(1600);
  });
});
