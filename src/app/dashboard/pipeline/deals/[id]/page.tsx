import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, DollarSign, Percent, Calendar, StickyNote, Trophy, XCircle, Undo2 } from "lucide-react";
import type { Task, Activity } from "@/lib/types";
import { markDealWon, markDealLost, reopenDeal } from "../actions";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function DealDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: deal, error } = await supabase
    .from("deals")
    .select("*, contact:contact_id(id, name, email, company)")
    .eq("id", id)
    .single();

  if (error || !deal) notFound();

  const contact = Array.isArray(deal.contact)
    ? deal.contact[0]
    : deal.contact;

  const { data: stageData } = await supabase
    .from("stages")
    .select("*, pipeline:pipeline_id(id, name)")
    .eq("id", deal.stage_id)
    .single();

  const stage = stageData;
  const pipeline = stage?.pipeline
    ? (Array.isArray(stage.pipeline) ? stage.pipeline[0] : stage.pipeline)
    : null;

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("deal_id", id)
    .order("due_date", { ascending: true });

  const { data: activities } = await supabase
    .from("activity")
    .select("*")
    .eq("deal_id", id)
    .order("created_at", { ascending: false });

  const tasksList = tasks || [];
  const activityList: Activity[] = activities || [];

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href={pipeline ? `/dashboard/pipeline/${pipeline.id}/board` : "/dashboard/pipeline"}
          className="inline-flex items-center justify-center rounded-md border border-input bg-background h-8 w-8 hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight">{deal.title}</h1>
            {deal.status === "won" && (
              <span className="inline-flex items-center rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 px-2.5 py-0.5 text-xs font-semibold">
                Won
              </span>
            )}
            {deal.status === "lost" && (
              <span className="inline-flex items-center rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 px-2.5 py-0.5 text-xs font-semibold">
                Lost
              </span>
            )}
          </div>
          {pipeline && (
            <p className="text-muted-foreground mt-1">
              {pipeline.name} · {stage?.name || "Unknown stage"}
            </p>
          )}
        </div>
        <Link
          href={`/dashboard/pipeline/deals/${deal.id}/edit`}
          className="inline-flex items-center justify-center rounded-md border border-input bg-background h-10 px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          <Pencil className="h-4 w-4 mr-2" />
          Edit
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-lg border p-6 space-y-4">
            <h2 className="font-semibold">Deal Info</h2>

            <div className="flex items-center gap-2 text-sm">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">${deal.value.toLocaleString()}</span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <Percent className="h-4 w-4 text-muted-foreground" />
              <span>{deal.probability}% probability</span>
            </div>

            {deal.close_date && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <span>
                  Closes {new Date(deal.close_date + "T00:00:00").toLocaleDateString()}
                </span>
              </div>
            )}

            {deal.lost_reason && (
              <div className="rounded-md bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 p-3">
                <p className="text-sm font-medium text-red-800 dark:text-red-200">
                  Loss reason
                </p>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  {deal.lost_reason}
                </p>
              </div>
            )}

            <div className="text-xs text-muted-foreground pt-2">
              Created {new Date(deal.created_at).toLocaleDateString()}
            </div>
          </div>

          {contact && (
            <div className="rounded-lg border p-6 space-y-3">
              <h2 className="font-semibold">Contact</h2>
              <Link
                href={`/dashboard/contacts/${contact.id}`}
                className="text-sm font-medium hover:text-primary"
              >
                {contact.name}
              </Link>
              {contact.email && (
                <p className="text-sm text-muted-foreground">{contact.email}</p>
              )}
              {contact.company && (
                <p className="text-sm text-muted-foreground">{contact.company}</p>
              )}
            </div>
          )}

          {deal.status === "open" && (
            <div className="rounded-lg border p-6 space-y-3">
              <h2 className="font-semibold">Actions</h2>
              <form action={async () => { "use server"; await markDealWon(deal.id); }}>
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center rounded-md bg-green-600 text-white h-10 px-4 py-2 text-sm font-medium hover:bg-green-700"
                >
                  <Trophy className="h-4 w-4 mr-2" />
                  Mark Won
                </button>
              </form>
              <form
                action={async (formData: FormData) => {
                  "use server";
                  const reason = (formData.get("reason") as string) || "";
                  await markDealLost(deal.id, reason);
                }}
                className="space-y-2"
              >
                <input
                  name="reason"
                  placeholder="Reason for loss (optional)"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center rounded-md border border-red-200 bg-background text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950 h-10 px-4 py-2 text-sm font-medium"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Mark Lost
                </button>
              </form>
            </div>
          )}

          {deal.status !== "open" && (
            <div className="rounded-lg border p-6">
              <form action={async () => { "use server"; await reopenDeal(deal.id); }}>
                <button
                  type="submit"
                  className="w-full inline-flex items-center justify-center rounded-md border border-input bg-background h-10 px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  <Undo2 className="h-4 w-4 mr-2" />
                  Reopen Deal
                </button>
              </form>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-lg border">
            <div className="p-4 border-b">
              <h2 className="font-semibold">Tasks ({tasksList.length})</h2>
            </div>
            <div className="p-4">
              {tasksList.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No tasks for this deal yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {tasksList.map((task: Task) => {
                    const isOverdue =
                      !task.completed &&
                      new Date(task.due_date) < new Date(new Date().toDateString());
                    return (
                      <div
                        key={task.id}
                        className="flex items-center justify-between rounded-md border p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-2.5 w-2.5 rounded-full ${
                              task.completed
                                ? "bg-green-500"
                                : isOverdue
                                  ? "bg-red-500"
                                  : "bg-blue-500"
                            }`}
                          />
                          <div>
                            <p
                              className={`text-sm font-medium ${
                                task.completed ? "line-through text-muted-foreground" : ""
                              }`}
                            >
                              {task.title}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {task.type} · Due{" "}
                              {new Date(task.due_date + "T00:00:00").toLocaleDateString()}
                              {isOverdue && (
                                <span className="text-red-500 font-medium ml-1">
                                  Overdue
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border">
            <div className="p-4 border-b">
              <h2 className="font-semibold">Activity Timeline</h2>
            </div>
            <div className="p-4">
              <div className="relative pl-5 border-l-2 border-muted space-y-4">
                {activityList.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No activity recorded yet.
                  </p>
                ) : (
                  activityList.map((activity) => {
                    const isDealChange = activity.type === "deal_change";
                    const isTaskCompleted = activity.type === "task_completed";
                    const dotColor = isTaskCompleted
                      ? "bg-green-500"
                      : isDealChange
                        ? "bg-blue-500"
                        : "bg-muted-foreground";
                    return (
                      <div key={activity.id} className="relative">
                        <div
                          className={`absolute -left-[25px] h-4 w-4 rounded-full ${dotColor} border-2 border-background`}
                        />
                        <p className="text-sm font-medium">
                          {activity.description}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(activity.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {deal.notes && (
            <div className="rounded-lg border p-6 space-y-2">
              <div className="flex items-center gap-2">
                <StickyNote className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold">Notes</h2>
              </div>
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                {deal.notes}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
