export interface DealValue {
  value: number;
}

export interface OpenDeal extends DealValue {
  probability: number;
  status: "open";
}

export function totalPipeline(deals: DealValue[]): number {
  return deals.reduce((sum, d) => sum + d.value, 0);
}

export function weightedPipeline(deals: OpenDeal[]): number {
  return deals.reduce((sum, d) => sum + d.value * (d.probability / 100), 0);
}

export function weightedPct(weighted: number, total: number): number {
  return total > 0 ? Math.round((weighted / total) * 100) : 0;
}

export function clampProbability(value: number): number {
  return Math.min(100, Math.max(0, value || 0));
}
