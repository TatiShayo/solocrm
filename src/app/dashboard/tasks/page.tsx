import { createClient } from "@/lib/supabase/server";
import type { Task } from "@/lib/types";
import { AddTaskForm } from "./_components/add-task-form";
import { TaskItem } from "./_components/task-item";
import { TaskFilters } from "./_components/task-filters";

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function TasksPage({ searchParams }: Props) {
  const params = await searchParams;
  const filter = typeof params.filter === "string" ? params.filter : "all";
  const type = typeof params.type === "string" ? params.type : "all";

  const supabase = await createClient();

  let query = supabase.from("tasks").select("*");

  if (filter === "open") {
    query = query.eq("completed", false);
  } else if (filter === "completed") {
    query = query.eq("completed", true);
  }

  if (type !== "all") {
    query = query.eq("type", type);
  }

  const { data: tasks } = await query.order("due_date", { ascending: true });

  const { data: contacts } = await supabase
    .from("contacts")
    .select("id, name, company")
    .order("name", { ascending: true });

  const { data: deals } = await supabase
    .from("deals")
    .select("id, title, status")
    .eq("status", "open")
    .order("created_at", { ascending: false });

  const tasksList: Task[] = (tasks || []);
  const contactsList = (contacts || []) as { id: string; name: string; company: string | null }[];
  const dealsList = deals || [];

  const overdueCount = tasksList.filter(
    (t) => !t.completed && new Date(t.due_date) < new Date(new Date().toDateString())
  ).length;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground mt-1">
            {tasksList.length} task{tasksList.length !== 1 ? "s" : ""}
            {overdueCount > 0 && (
              <span className="text-red-500 font-medium ml-2">
                · {overdueCount} overdue
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="lg:col-span-2 space-y-6">
          <TaskFilters currentFilter={filter} currentType={type} />

          <div className="space-y-2">
            {tasksList.length === 0 ? (
              <div className="rounded-lg border p-8 text-center">
                <p className="text-muted-foreground">No tasks found.</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Add a task using the form on the right.
                </p>
              </div>
            ) : (
              tasksList.map((task) => (
                <TaskItem key={task.id} task={task} contacts={contactsList} deals={dealsList} />
              ))
            )}
          </div>
        </div>

        <div>
          <AddTaskForm
            contacts={contactsList}
            openDeals={dealsList}
          />
        </div>
      </div>
    </div>
  );
}
