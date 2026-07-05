export function calculateScheduledAt(delayDays: number, fromDate?: Date): Date {
  return new Date((fromDate || new Date()).getTime() + delayDays * 24 * 60 * 60 * 1000);
}
