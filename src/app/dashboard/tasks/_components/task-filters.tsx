import Link from "next/link";

interface TaskFiltersProps {
  currentFilter: string;
  currentType: string;
}

const filterOptions = [
  { value: "all", label: "All" },
  { value: "today", label: "Today" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "week", label: "This Week" },
  { value: "overdue", label: "Overdue" },
];

const typeOptions = [
  { value: "all", label: "All Types" },
  { value: "call", label: "Call" },
  { value: "email", label: "Email" },
  { value: "meeting", label: "Meeting" },
  { value: "follow-up", label: "Follow-up" },
];

export function TaskFilters({ currentFilter, currentType }: TaskFiltersProps) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center rounded-md border border-input bg-background p-0.5">
        {filterOptions.map((opt) => (
          <Link
            key={opt.value}
            href={`/dashboard/tasks?filter=${opt.value}&type=${currentType}`}
            className={`px-3 py-1 text-sm rounded-sm transition-colors ${
              currentFilter === opt.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {opt.label}
          </Link>
        ))}
      </div>
      <div className="flex items-center rounded-md border border-input bg-background p-0.5">
        {typeOptions.map((opt) => (
          <Link
            key={opt.value}
            href={`/dashboard/tasks?filter=${currentFilter}&type=${opt.value}`}
            className={`px-3 py-1 text-sm rounded-sm transition-colors ${
              currentType === opt.value
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {opt.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
