import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { db } from '../db';
import { updateDealStage, markDealWon, markDealLost } from '../../app/actions/deals';

vi.mock('next/cache', () => ({
  revalidatePath: () => {},
}));

vi.mock('next/headers', () => ({
  cookies: () => ({
    get: () => undefined,
    set: () => {},
    delete: () => {},
  }),
  headers: () => ({
    get: () => undefined,
  }),
}));

describe('Deal Pipeline Stage Transitions & Timeline Invariants', () => {
  const mockNow = new Date('2026-07-01T12:00:00.000Z');

  beforeEach(async () => {
    await db.reset();
    vi.useFakeTimers();
    vi.setSystemTime(mockNow);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('updates deal stage and probability to stage probability when moving to open stage', async () => {
    const deals = await db.deals.list(d => d.user_id === 'default-user');
    const deal = deals[0]; // Deal in Lead stage (10% prob)

    // Move to stage-proposal (60% prob)
    const result = await updateDealStage(deal.id, 'stage-proposal');
    expect(result.success).toBe(true);

    const updated = await db.deals.findById(deal.id);
    expect(updated!.stage_id).toBe('stage-proposal');
    expect(updated!.probability).toBe(60);
    expect(updated!.won_at).toBeNull();
    expect(updated!.lost_at).toBeNull();

    // Verify timeline event logged
    const timeline = await db.dealTimeline.list(t => t.deal_id === deal.id);
    expect(timeline.some(e => e.event_type === 'stage_change' && e.description.includes('Proposal'))).toBe(true);
  });

  it('sets won_at, clears lost fields, and sets probability to 100 when moved to Won stage', async () => {
    const deals = await db.deals.list(d => d.user_id === 'default-user');
    const deal = deals[0];

    const result = await updateDealStage(deal.id, 'stage-won');
    expect(result.success).toBe(true);

    const wonDeal = await db.deals.findById(deal.id);
    expect(wonDeal!.stage_id).toBe('stage-won');
    expect(wonDeal!.probability).toBe(100);
    expect(wonDeal!.won_at).toBe(mockNow.toISOString());
    expect(wonDeal!.lost_at).toBeNull();
    expect(wonDeal!.lost_reason).toBeNull();
  });

  it('sets lost_at, sets default lost_reason, and sets probability to 0 when moved to Lost stage', async () => {
    const deals = await db.deals.list(d => d.user_id === 'default-user');
    const deal = deals[0];

    const result = await updateDealStage(deal.id, 'stage-lost');
    expect(result.success).toBe(true);

    const lostDeal = await db.deals.findById(deal.id);
    expect(lostDeal!.stage_id).toBe('stage-lost');
    expect(lostDeal!.probability).toBe(0);
    expect(lostDeal!.lost_at).toBe(mockNow.toISOString());
    expect(lostDeal!.won_at).toBeNull();
    expect(lostDeal!.lost_reason).toBe('Moved to Lost');
  });

  it('clears won_at / lost_at when moved back from Won or Lost to an open stage', async () => {
    const deals = await db.deals.list(d => d.user_id === 'default-user');
    const deal = deals[0];

    // Move to won
    await updateDealStage(deal.id, 'stage-won');
    
    // Move back to Negotiation
    const result = await updateDealStage(deal.id, 'stage-negotiation');
    expect(result.success).toBe(true);

    const reopenedDeal = await db.deals.findById(deal.id);
    expect(reopenedDeal!.stage_id).toBe('stage-negotiation');
    expect(reopenedDeal!.probability).toBe(80);
    expect(reopenedDeal!.won_at).toBeNull();
    expect(reopenedDeal!.lost_at).toBeNull();
    expect(reopenedDeal!.lost_reason).toBeNull();
  });

  it('marks deal won using markDealWon action', async () => {
    const deals = await db.deals.list(d => d.user_id === 'default-user');
    const deal = deals[0];

    const res = await markDealWon(deal.id);
    expect(res.success).toBe(true);

    const updated = await db.deals.findById(deal.id);
    expect(updated!.won_at).toBe(mockNow.toISOString());
    expect(updated!.probability).toBe(100);
  });

  it('marks deal lost with custom reason using markDealLost action', async () => {
    const deals = await db.deals.list(d => d.user_id === 'default-user');
    const deal = deals[0];

    const res = await markDealLost(deal.id, 'Selected competitor offering lower tier');
    expect(res.success).toBe(true);

    const updated = await db.deals.findById(deal.id);
    expect(updated!.lost_at).toBe(mockNow.toISOString());
    expect(updated!.lost_reason).toBe('Selected competitor offering lower tier');
    expect(updated!.probability).toBe(0);
  });

  it('rejects updating stage for a non-existent deal', async () => {
    const res = await updateDealStage('non-existent-deal-id', 'stage-won');
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
  });

  it('rejects updating stage to a non-existent stage ID', async () => {
    const deals = await db.deals.list(d => d.user_id === 'default-user');
    const res = await updateDealStage(deals[0].id, 'non-existent-stage-id');
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
  });
});
