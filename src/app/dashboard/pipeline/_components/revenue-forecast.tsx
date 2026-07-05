import { createClient } from "@/lib/supabase/server";
import { DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/format";

interface ForecastData {
  total: number;
  weighted: number;
  count: number;
  wonTotal: number;
}

export async function RevenueForecast() {
  const supabase = await createClient();

  const { data: deals } = await supabase
    .from("deals")
    .select("value, probability, status");

  if (!deals || deals.length === 0) {
    return (
      <div className="rounded-lg border p-6 space-y-2">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-muted-foreground" />
          <h2 className="font-semibold">Revenue Forecast</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          No deals yet. Add deals to see your forecast.
        </p>
      </div>
    );
  }

  const openDeals = deals.filter((d) => d.status === "open");
  const wonDeals = deals.filter((d) => d.status === "won");

  const totalPipeline = openDeals.reduce((sum, d) => sum + Number(d.value), 0);
  const weightedPipeline = openDeals.reduce(
    (sum, d) => sum + Number(d.value) * (Number(d.probability) / 100),
    0
  );
  const wonTotal = wonDeals.reduce((sum, d) => sum + Number(d.value), 0);

  const pctOfTotal =
    totalPipeline > 0 ? Math.round((weightedPipeline / totalPipeline) * 100) : 0;

  return (
    <div className="rounded-lg border p-6 space-y-4">
      <div className="flex items-center gap-2">
        <DollarSign className="h-5 w-5 text-muted-foreground" />
        <h2 className="font-semibold">Revenue Forecast</h2>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-2xl font-bold">
            {formatCurrency(Math.round(weightedPipeline))}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Weighted forecast ({openDeals.length} open deal
            {openDeals.length !== 1 ? "s" : ""})
          </p>
        </div>
        <div>
          <p className="text-2xl font-bold text-muted-foreground">
            {formatCurrency(totalPipeline)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Total pipeline ({pctOfTotal}% weighted avg)
          </p>
        </div>
      </div>

      {wonDeals.length > 0 && (
        <div className="pt-2 border-t">
          <p className="text-sm">
            <span className="font-medium text-green-600 dark:text-green-400">
              {formatCurrency(wonTotal)}
            </span>
            <span className="text-muted-foreground">
              {" "}
              closed won ({wonDeals.length} deal
              {wonDeals.length !== 1 ? "s" : ""})
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
