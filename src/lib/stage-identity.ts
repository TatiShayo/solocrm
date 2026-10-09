/**
 * Stage identity resolution.
 *
 * `pipeline-math.ts` matched `stage_id === 'stage-won'` / `'stage-lost'` as
 * string literals. Real signups get `randomUUID()` stage ids (db.ts seeds
 * stages without ids for anyone but the built-in demo user), so every win-rate,
 * forecast, avg-deal-size and sales-cycle figure was silently wrong for all
 * non-demo accounts.
 *
 * Resolve by stage NAME, which is stable, and thread the result through instead
 * of hardcoding ids at each call site.
 */

export interface StageLike {
  id: string;
  name: string;
}

const WON_NAMES = new Set(["won", "closed won", "win"]);
const LOST_NAMES = new Set(["lost", "closed lost", "lose"]);

function normalise(name: string): string {
  return name.trim().toLowerCase().replace(/[\s_-]+/g, " ");
}

/** Ids of the stages that represent a won deal. */
export function resolveWonStageIds(stages: StageLike[] | undefined | null): Set<string> {
  const out = new Set<string>();
  for (const stage of stages ?? []) {
    if (WON_NAMES.has(normalise(stage.name))) out.add(stage.id);
  }
  return out;
}

/** Ids of the stages that represent a lost deal. */
export function resolveLostStageIds(stages: StageLike[] | undefined | null): Set<string> {
  const out = new Set<string>();
  for (const stage of stages ?? []) {
    if (LOST_NAMES.has(normalise(stage.name))) out.add(stage.id);
  }
  return out;
}

export type StageIndex = {
  wonIds: Set<string>;
  lostIds: Set<string>;
};

/** Resolve both sets in one pass — call once and pass the result down. */
export function buildStageIndex(stages: StageLike[] | undefined | null): StageIndex {
  const wonIds = new Set<string>();
  const lostIds = new Set<string>();
  for (const stage of stages ?? []) {
    const key = normalise(stage.name);
    if (WON_NAMES.has(key)) wonIds.add(stage.id);
    else if (LOST_NAMES.has(key)) lostIds.add(stage.id);
  }
  return { wonIds, lostIds };
}

/**
 * A deal is "won" when it carries a won timestamp (the authoritative signal) or
 * it currently sits in a won stage. Falls back to the legacy literal only when
 * no stage list was supplied, so old behaviour is preserved for callers that
 * have not been threaded yet.
 */
export function isWonDeal(
  deal: { won_at?: string | null; stage_id?: string | null },
  index?: StageIndex
): boolean {
  if (deal.won_at) return true;
  if (!index) return deal.stage_id === "stage-won";
  return deal.stage_id != null && index.wonIds.has(deal.stage_id);
}

export function isLostDeal(
  deal: { lost_at?: string | null; stage_id?: string | null },
  index?: StageIndex
): boolean {
  if (deal.lost_at) return true;
  if (!index) return deal.stage_id === "stage-lost";
  return deal.stage_id != null && index.lostIds.has(deal.stage_id);
}
