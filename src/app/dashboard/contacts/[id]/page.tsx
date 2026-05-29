import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Mail, Phone, Building, Briefcase, Tag, StickyNote, Pencil } from "lucide-react";
import type { Deal, Task } from "@/lib/types";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function ContactDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: contact, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !contact) {
    notFound();
  }

  const { data: deals } = await supabase
    .from("deals")
    .select("*")
    .eq("contact_id", id)
    .order("created_at", { ascending: false });

  const { data: tasks } = await supabase
    .from("tasks")
    .select("*")
    .eq("contact_id", id)
    .order("due_date", { ascending: true });

  const dealsList = deals || [];
  const tasksList = tasks || [];

  return (
    <div className="p-8">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/dashboard/contacts"
          className="inline-flex items-center justify-center rounded-md border border-input bg-background h-8 w-8 hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">
            {contact.name}
          </h1>
        </div>
        <Link
          href={`/dashboard/contacts/${contact.id}/edit`}
          className="inline-flex items-center justify-center rounded-md border border-input bg-background h-10 px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          <Pencil className="h-4 w-4 mr-2" />
          Edit
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-lg border p-6 space-y-4">
            <h2 className="font-semibold">Contact Info</h2>

            {contact.email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`mailto:${contact.email}`}
                  className="text-primary hover:underline"
                >
                  {contact.email}
                </a>
              </div>
            )}

            {contact.phone && (
              <div className="flex items-center gap-2 text-sm">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <a
                  href={`tel:${contact.phone}`}
                  className="text-primary hover:underline"
                >
                  {contact.phone}
                </a>
              </div>
            )}

            {contact.company && (
              <div className="flex items-center gap-2 text-sm">
                <Building className="h-4 w-4 text-muted-foreground" />
                <span>{contact.company}</span>
              </div>
            )}

            {contact.title && (
              <div className="flex items-center gap-2 text-sm">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                <span>{contact.title}</span>
              </div>
            )}

            {contact.source && (
              <div className="flex items-center gap-2 text-sm">
                <Tag className="h-4 w-4 text-muted-foreground" />
                <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                  {contact.source}
                </span>
              </div>
            )}

            {contact.tags && contact.tags.length > 0 && (
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Tags
                </p>
                <div className="flex gap-1 flex-wrap">
                  {contact.tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="text-xs text-muted-foreground pt-2">
              Added {new Date(contact.created_at).toLocaleDateString()}
            </div>
          </div>

          {contact.notes && (
            <div className="rounded-lg border p-6 space-y-2">
              <div className="flex items-center gap-2">
                <StickyNote className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-semibold">Notes</h2>
              </div>
              <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                {contact.notes}
              </p>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-lg border">
            <div className="p-4 border-b">
              <h2 className="font-semibold">
                Deals ({dealsList.length})
              </h2>
            </div>
            <div className="p-4">
              {dealsList.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No deals linked to this contact yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {dealsList.map((deal: Deal) => (
                    <div
                      key={deal.id}
                      className="flex items-center justify-between rounded-md border p-3"
                    >
                      <div>
                        <p className="text-sm font-medium">{deal.title}</p>
                        <p className="text-xs text-muted-foreground">
                          ${deal.value.toLocaleString()} · {deal.probability}% ·
                          {deal.status === "won"
                            ? " Won"
                            : deal.status === "lost"
                              ? " Lost"
                              : " Open"}
                        </p>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          deal.status === "won"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : deal.status === "lost"
                              ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                              : "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        }`}
                      >
                        {deal.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border">
            <div className="p-4 border-b">
              <h2 className="font-semibold">
                Tasks ({tasksList.length})
              </h2>
            </div>
            <div className="p-4">
              {tasksList.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No tasks for this contact yet.
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
                              {new Date(
                                task.due_date + "T00:00:00"
                              ).toLocaleDateString()}
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
                <div className="relative">
                  <div className="absolute -left-[25px] h-4 w-4 rounded-full bg-muted border-2 border-background" />
                  <p className="text-sm font-medium">
                    Contact created
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(contact.created_at).toLocaleDateString()}
                  </p>
                </div>
                {contact.updated_at !== contact.created_at && (
                  <div className="relative">
                    <div className="absolute -left-[25px] h-4 w-4 rounded-full bg-muted border-2 border-background" />
                    <p className="text-sm font-medium">Contact updated</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(contact.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
