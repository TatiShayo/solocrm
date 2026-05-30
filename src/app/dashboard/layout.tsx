import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogOut, Users, Kanban, ListChecks, Mail, Settings } from "lucide-react";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const today = new Date(new Date().toDateString()).toISOString();
  const { count: overdueCount } = await supabase
    .from("tasks")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("completed", false)
    .lt("due_date", today);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/dashboard" className="font-bold text-lg whitespace-nowrap">
              SoloCRM
            </Link>
            <nav className="hidden md:flex items-center gap-1">
              <Link
                href="/dashboard/contacts"
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Users className="h-4 w-4" />
                <span className="hidden lg:inline">Contacts</span>
              </Link>
              <Link
                href="/dashboard/pipeline"
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Kanban className="h-4 w-4" />
                <span className="hidden lg:inline">Pipeline</span>
              </Link>
              <Link
                href="/dashboard/tasks"
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <ListChecks className="h-4 w-4" />
                <span className="hidden lg:inline">Tasks</span>
                {overdueCount != null && overdueCount > 0 && (
                  <span className="inline-flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1">
                    {overdueCount}
                  </span>
                )}
              </Link>
              <Link
                href="/dashboard/sequences"
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Mail className="h-4 w-4" />
                <span className="hidden lg:inline">Sequences</span>
              </Link>
              <Link
                href="/dashboard/settings"
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden lg:inline">Settings</span>
              </Link>
            </nav>
            <nav className="flex md:hidden items-center gap-1">
              <Link
                href="/dashboard/contacts"
                className="inline-flex items-center justify-center rounded-md h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                aria-label="Contacts"
              >
                <Users className="h-4 w-4" />
              </Link>
              <Link
                href="/dashboard/pipeline"
                className="inline-flex items-center justify-center rounded-md h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                aria-label="Pipeline"
              >
                <Kanban className="h-4 w-4" />
              </Link>
              <Link
                href="/dashboard/tasks"
                className="inline-flex items-center justify-center rounded-md h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted relative"
                aria-label="Tasks"
              >
                <ListChecks className="h-4 w-4" />
                {overdueCount != null && overdueCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold min-w-[16px] h-[16px] px-1">
                    {overdueCount}
                  </span>
                )}
              </Link>
              <Link
                href="/dashboard/sequences"
                className="inline-flex items-center justify-center rounded-md h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                aria-label="Sequences"
              >
                <Mail className="h-4 w-4" />
              </Link>
              <Link
                href="/dashboard/settings"
                className="inline-flex items-center justify-center rounded-md h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted"
                aria-label="Settings"
              >
                <Settings className="h-4 w-4" />
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-sm text-muted-foreground mr-2">
              {user.email}
            </span>
            <form action="/auth/logout" method="post">
              <Button variant="ghost" size="icon" type="submit">
                <LogOut className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}
