import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import PipelineVelocity from "./_components/pipeline-velocity";
import WinRateBySource from "./_components/win-rate-source";
import DealSizeDistribution from "./_components/deal-size-dist";
import MonthlyRevenue from "./_components/monthly-revenue";
import AnalyticsExport from "./_components/analytics-export";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatCurrency } from "@/lib/format";
import { Contact, Deal } from "@/lib/types";

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: deals, error: dealsError } = await supabase
    .from("deals")
    .select("*, contact:contacts(*)");

  const { data: contacts, error: contactsError } = await supabase
    .from("contacts")
    .select("id, name, company, source");

  const { data: stages, error: stagesError } = await supabase
    .from("stages")
    .select("id, name");

  if (dealsError || contactsError || stagesError) {
    console.error(
      "Error fetching analytics data:",
      dealsError || contactsError || stagesError
    );
    return (
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <h2 className="text-3xl font-bold tracking-tight">Analytics Dashboard</h2>
        <p className="text-red-500">Error loading analytics data.</p>
      </div>
    );
  }

  const wonDeals = (deals as Deal[]).filter((deal) => deal.status === "won");

  const topContacts = (deals as any[])
    .reduce(
      (
        acc,
        deal
      ): {
        id: string;
        name: string;
        company: string;
        deal_value: number;
        deal_count: number;
      }[] => {
        if (!deal.contact) return acc;
        const existing = acc.find((c) => c.id === deal.contact.id);
        if (existing) {
          existing.deal_value += deal.value || 0;
          existing.deal_count += 1;
        } else {
          acc.push({
            id: deal.contact.id,
            name: deal.contact.name,
            company: deal.contact.company,
            deal_value: deal.value || 0,
            deal_count: 1,
          });
        }
        return acc;
      },
      []
    )
    .sort((a, b) => b.deal_value - a.deal_value)
    .slice(0, 10);

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">
          Analytics Dashboard
        </h2>
        <div className="flex items-center space-x-2">
          <AnalyticsExport
            deals={deals as Deal[]}
            contacts={contacts as Contact[]}
          />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <PipelineVelocity deals={deals as Deal[]} stages={stages} />
        <WinRateBySource deals={deals as (Deal & { contact: Contact | null })[]} />
        <DealSizeDistribution deals={deals as Deal[]} />
        <MonthlyRevenue deals={wonDeals} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Top 10 Contacts by Deal Value</CardTitle>
          <CardDescription>
            Contacts associated with the highest value of deals.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">Rank</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Company</TableHead>
                <TableHead className="text-right">Total Deal Value</TableHead>
                <TableHead className="text-right">Deals</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {topContacts.map((contact, index) => (
                <TableRow key={contact.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="font-medium">{contact.name}</TableCell>
                  <TableCell>{contact.company}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(contact.deal_value)}
                  </TableCell>
                  <TableCell className="text-right">
                    {contact.deal_count}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
