"use client";

import { useTransition } from "react";
import Link from "next/link";
import { Phone, Mail, Calendar, Clock, Trash2 } from "lucide-react";
import type { Task } from "@/lib/types";
import { toggleComplete, removeTask } from "./actions";

const typeIcons: Record<string, React.ReactNode> = {
  call: <Phone className="h-3.5 w-3.5" />,
  email: <Mail className="h-3.5 w-3.5" />,
  meeting: <Calendar className="h-3.5 w-3.5" />,
  "follow-up": <Clock className="h-3.5 w-3.5" />,
};

interface Props {
  task: Task;
  contacts: { id: string; name: string; company: string | null }[];
  deals: { id: string; title: string }[];
}

export function TaskItem({ task, contacts, deals }: Props) {
  const [isPending, startTransition] = useTransition();
  const today = new Date().toDateString();
  const dueDate = new Date(task.due_date + "T00:00:00");

  const isOverdue = !task.completed && dueDate.toDateString() < today;
  const isToday = !task.completed && dueDate.toDateString() === today;

  const contact = contacts.find((c) => c.id === task.contact_id);
  const deal = deals.find((d) => d.id === task.deal_id);

  let borderColor = "border-transparent";
  if (task.completed) {
    borderColor = "border-green-500/40";
  } else if (isOverdue) {
    borderColor = "border-red-500";
  } else if (isToday) {
    borderColor = "border-amber-500";
  }

  function handleToggle() {
    startTransition(() => {
      toggleComplete(task.id);
    });
  }

  function handleDelete() {
    startTransition(() => {
      removeTask(task.id);
    });
  }

  return (
    <div
      className={`flex items-center justify-between rounded-md border-l-4 ${borderColor} border border-input p-3 group hover:bg-muted/50 transition-colors`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={handleToggle}
          disabled={isPending}
          className={`h-5 w-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all cursor-pointer ${
            task.completed
              ? "bg-green-500 border-green-500 text-white"
              : isOverdue
                ? "border-red-400 hover:border-red-500"
                : "border-muted-foreground/30 hover:border-primary"
          }`}
        >
          {task.completed && (
            <svg
              className="h-3 w-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={3}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
        </button>
        <div className="min-w-0 flex-1">
          <p
            className={`text-sm font-medium truncate transition-all duration-200 ${
              task.completed ? "line-through text-muted-foreground opacity-60" : ""
            }`}
          >
            {task.title}
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 flex-wrap">
            <span className="inline-flex items-center gap-0.5">
              {typeIcons[task.type]}
              {task.type}
            </span>
            {contact && (
              <>
                <span>·</span>
                <Link
                  href={`/dashboard/contacts/${contact.id}`}
                  className="hover:text-primary transition-colors"
                >
                  {contact.name}
                </Link>
              </>
            )}
            {deal && (
              <>
                <span>·</span>
                <Link
                  href={`/dashboard/pipeline/deals/${deal.id}`}
                  className="hover:text-primary transition-colors"
                >
                  {deal.title}
                </Link>
              </>
            )}
            <span>·</span>
            <span>{dueDate.toLocaleDateString()}</span>
            {isOverdue && (
              <>
                <span>·</span>
                <span className="text-red-500 font-medium">Overdue</span>
              </>
            )}
            {task.notes && (
              <>
                <span>·</span>
                <span className="italic text-xs opacity-60 truncate max-w-[200px]">
                  {task.notes}
                </span>
              </>
            )}
          </p>
        </div>
      </div>
      <button
        onClick={handleDelete}
        disabled={isPending}
        className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}
