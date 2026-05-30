import { RevenueForecast } from "@/app/dashboard/pipeline/_components/revenue-forecast";
import { SequenceTrigger } from "@/app/dashboard/_components/sequence-trigger";
import { createClient } from "@/lib/supabase/server";
import { Users, Briefcase, CheckCircle2 } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();

  const { count: contactCount } = await supabase
    .from("contacts")
    .select("*", { count: "exact", head: true });

  const { count: dealCount } = await supabase
    .from("deals")
    .select("*", { count: "exact", head: true });

  const { count: wonCount } = await supabase
    .from("deals")
    .select("*", { count: "exact", head: true })
    .eq("status", "won");

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
      <p className="text-muted-foreground mt-1">
        Welcome to SoloCRM. Your contacts, pipeline, and tasks at a glance.
      </p>

      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="rounded-lg border p-4 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span className="text-sm">Contacts</span>
          </div>
          <p className="text-2xl font-bold">{contactCount ?? 0}</p>
        </div>
        <div className="rounded-lg border p-4 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Briefcase className="h-4 w-4" />
            <span className="text-sm">Deals</span>
          </div>
          <p className="text-2xl font-bold">{dealCount ?? 0}</p>
        </div>
        <div className="rounded-lg border p-4 space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CheckCircle2 className="h-4 w-4" />
            <span className="text-sm">Won</span>
          </div>
          <p className="text-2xl font-bold">{wonCount ?? 0}</p>
        </div>
      </div>

      <div className="mt-6">
        <RevenueForecast />
      </div>

      <SequenceTrigger />
    </div>
  );
}
