import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, X, ArrowRight } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between px-6 max-w-6xl mx-auto w-full">
          <span className="font-bold text-lg">SoloCRM</span>
          <div className="flex items-center gap-3">
            <Link href="/auth/login">
              <Button variant="ghost" size="sm">Sign in</Button>
            </Link>
            <Link href="/auth/signup">
              <Button size="sm">Start free</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="px-6 py-20 md:py-32 max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            Every lead.<br />Every deal.<br />
            <span className="text-primary">No BS pricing.</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            The CRM built for solo founders. Contacts, pipeline, tasks, and email sequences —
            no upsells, no gated features, no $800/mo surprises.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/auth/signup">
              <Button size="lg" className="gap-2">
                Start free — no credit card <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="#pricing">
              <Button variant="outline" size="lg">
                See pricing
              </Button>
            </Link>
          </div>
        </section>

        <section className="px-6 py-16 bg-muted/50" id="pricing">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-4">Simple, transparent pricing</h2>
            <p className="text-muted-foreground text-center mb-10">No bait-and-switch. No hidden fees. No contract.</p>

            <div className="grid md:grid-cols-2 gap-6 max-w-2xl mx-auto">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Free</CardTitle>
                  <p className="text-3xl font-bold">$0<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-green-500" /> Up to 250 contacts</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-green-500" /> 1 pipeline</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-green-500" /> Task management</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-green-500" /> Kanban board</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-green-500" /> CSV import</li>
                  </ul>
                </CardContent>
              </Card>
              <Card className="border-primary">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    Pro
                    <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">Best value</span>
                  </CardTitle>
                  <p className="text-3xl font-bold">$10<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-green-500" /> Unlimited contacts</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-green-500" /> Unlimited pipelines</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-green-500" /> Email sequences</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-green-500" /> AI email writer</li>
                    <li className="flex items-center gap-2 text-sm"><Check className="h-4 w-4 text-green-500" /> Everything in Free</li>
                  </ul>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="px-6 py-16 max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-4">How we compare</h2>
          <p className="text-muted-foreground text-center mb-10">
            Stop overpaying for features you don&apos;t need.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Feature</th>
                  <th className="text-center py-3 px-4 font-medium bg-primary/5 rounded-t-lg">
                    <span className="font-bold">SoloCRM</span>
                    <span className="block text-xs text-muted-foreground">Free / $10/mo</span>
                  </th>
                  <th className="text-center py-3 px-4 font-medium">
                    HubSpot
                    <span className="block text-xs text-muted-foreground">Free → $800/mo</span>
                  </th>
                  <th className="text-center py-3 px-4 font-medium">
                    Pipedrive
                    <span className="block text-xs text-muted-foreground">$14.90/mo</span>
                  </th>
                  <th className="text-center py-3 px-4 font-medium">
                    Monday CRM
                    <span className="block text-xs text-muted-foreground">$10/mo</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.map((row, i) => (
                  <tr key={i} className="border-b">
                    <td className="py-3 px-4">{row.feature}</td>
                    <td className="text-center py-3 px-4 bg-primary/5">
                      {row.solo ? <Check className="h-4 w-4 text-green-500 inline" /> : <X className="h-4 w-4 text-red-400 inline" />}
                      {row.soloNote && <span className="block text-xs text-muted-foreground">{row.soloNote}</span>}
                    </td>
                    <td className="text-center py-3 px-4">
                      {row.hubspot ? <Check className="h-4 w-4 text-green-500 inline" /> : <X className="h-4 w-4 text-red-400 inline" />}
                      {row.hubspotNote && <span className="block text-xs text-muted-foreground">{row.hubspotNote}</span>}
                    </td>
                    <td className="text-center py-3 px-4">
                      {row.pipedrive ? <Check className="h-4 w-4 text-green-500 inline" /> : <X className="h-4 w-4 text-red-400 inline" />}
                      {row.pipedriveNote && <span className="block text-xs text-muted-foreground">{row.pipedriveNote}</span>}
                    </td>
                    <td className="text-center py-3 px-4">
                      {row.monday ? <Check className="h-4 w-4 text-green-500 inline" /> : <X className="h-4 w-4 text-red-400 inline" />}
                      {row.mondayNote && <span className="block text-xs text-muted-foreground">{row.mondayNote}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="px-6 py-16 bg-primary text-primary-foreground">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to stop fighting your CRM?</h2>
            <p className="text-primary-foreground/80 mb-8">
              Start free. Upgrade when you need more. Cancel anytime.
            </p>
            <Link href="/auth/signup">
              <Button variant="secondary" size="lg" className="gap-2">
                Get started free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t py-8 px-6">
        <div className="max-w-6xl mx-auto text-center text-sm text-muted-foreground">
          SoloCRM &mdash; Built for solopreneurs
        </div>
      </footer>
    </div>
  );
}

const comparisonData = [
  { feature: "Unlimited contacts", solo: true, hubspot: false, hubspotNote: "1M on paid", pipedrive: true, monday: true },
  { feature: "Kanban pipeline", solo: true, hubspot: true, pipedrive: true, monday: true },
  { feature: "Email sequences", solo: true, soloNote: "Pro plan", hubspot: true, hubspotNote: "$800/mo", pipedrive: false, monday: false },
  { feature: "AI assistant", solo: true, soloNote: "Pro plan", hubspot: true, hubspotNote: "Add-on", pipedrive: true, pipedriveNote: "Add-on", monday: true, mondayNote: "Add-on" },
  { feature: "CSV import", solo: true, hubspot: true, pipedrive: true, monday: true },
  { feature: "Task management", solo: true, hubspot: true, pipedrive: true, monday: true },
  { feature: "No hidden upsells", solo: true, hubspot: false, hubspotNote: "Bait-and-switch", pipedrive: false, pipedriveNote: "Limited free", monday: false, mondayNote: "Complex" },
  { feature: "Simple pricing", solo: true, hubspot: false, hubspotNote: "5 tiers", pipedrive: false, pipedriveNote: "5 tiers", monday: false, mondayNote: "5 tiers" },
];
