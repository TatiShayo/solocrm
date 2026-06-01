export function formatCurrency(
  value: number,
  notation: "standard" | "compact" = "standard"
): string {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    notation,
  });
  return formatter.format(value);
}
