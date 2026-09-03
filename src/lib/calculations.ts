import { Deal, PipelineStage } from './db';
import { roundToCents, clampProbability } from './pipeline-math';

/**
 * Calculates the weighted revenue forecast.
 * Filters out won and lost deals (where won_at or lost_at is not null),
 * and calculates the forecast based on the stage probability for open deals.
 */
export function calculateRevenueForecast(deals: Deal[], stages: PipelineStage[]): number {
  const openDeals = deals.filter(d => d.won_at === null && d.lost_at === null);
  const sum = openDeals.reduce((total, d) => {
    const stage = stages.find(s => s.id === d.stage_id);
    const probability = stage ? clampProbability(stage.probability) : 0;
    return total + (d.value * (probability / 100));
  }, 0);
  return roundToCents(sum);
}
