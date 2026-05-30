import Link from "next/link";
import type { Contact } from "@/lib/types";

function sortArrow(sort: string, order: string, field: string) {
  if (sort !== field) return "";
  return order === "asc" ? " ↑" : " ↓";
}

function buildSortHref(
  baseParams: Record<string, string>,
  field: string
) {
  const p = new URLSearchParams();
  Object.entries(baseParams).forEach(([k, v]) => {
    if (v) p.set(k, v);
  });
  p.set("sort", field);
  p.set(
    "order",
    baseParams.sort === field && baseParams.order === "desc" ? "asc" : "desc"
  );
  const qs = p.toString();
  return `/dashboard/contacts${qs ? `?${qs}` : ""}`;
}

interface Props {
  contacts: Contact[];
  search: string;
  source: string;
  sort: string;
  order: string;
}

export function ContactsTable({
  contacts,
  search,
  source,
  sort,
  order,
}: Props) {
  const baseParams = { search, source, sort, order };

  return (
    <div className="rounded-md border">
      <table className="w-full caption-bottom text-sm">
        <thead>
          <tr className="border-b">
            <th className="h-10 px-4 text-left align-middle font-medium text-foreground">
              <Link
                href={buildSortHref(baseParams, "name")}
                className="inline-flex items-center gap-1 hover:text-primary"
              >
                Name{sortArrow(sort, order, "name")}
              </Link>
            </th>
            <th className="h-10 px-4 text-left align-middle font-medium text-foreground">
              <Link
                href={buildSortHref(baseParams, "created_at")}
                className="inline-flex items-center gap-1 hover:text-primary"
              >
                <span className="hidden sm:inline">Date Added</span>
                <span className="sm:hidden">Date</span>
                {sortArrow(sort, order, "created_at")}
              </Link>
            </th>
            <th className="h-10 px-4 text-left align-middle font-medium text-foreground">
              <Link
                href={buildSortHref(baseParams, "company")}
                className="inline-flex items-center gap-1 hover:text-primary"
              >
                <span className="hidden sm:inline">Company</span>{sortArrow(sort, order, "company")}
              </Link>
            </th>
            <th className="h-10 px-4 text-left align-middle font-medium text-foreground hidden sm:table-cell">
              Email
            </th>
            <th className="h-10 px-4 text-left align-middle font-medium text-foreground hidden sm:table-cell">
              Source
            </th>
            <th className="h-10 px-4 text-left align-middle font-medium text-foreground hidden sm:table-cell">
              Tags
            </th>
          </tr>
        </thead>
        <tbody>
          {contacts.length === 0 ? (
            <tr>
              <td
                colSpan={6}
                className="p-8 text-center text-muted-foreground"
              >
                {search || source
                  ? "No contacts match your filters."
                  : "No contacts yet. Add your first contact to get started."}
              </td>
            </tr>
          ) : (
            contacts.map((contact) => (
              <tr
                key={contact.id}
                className="border-b transition-colors hover:bg-muted/50"
              >
                <td className="p-3 md:p-4 align-middle">
                  <Link
                    href={`/dashboard/contacts/${contact.id}`}
                    className="font-medium hover:text-primary"
                  >
                    {contact.name}
                  </Link>
                </td>
                <td className="p-3 md:p-4 align-middle text-muted-foreground whitespace-nowrap text-xs sm:text-sm">
                  {new Date(contact.created_at).toLocaleDateString()}
                </td>
                <td className="p-4 align-middle text-muted-foreground hidden sm:table-cell">
                  {contact.company || "—"}
                </td>
                <td className="p-4 align-middle hidden sm:table-cell">
                  {contact.email || "—"}
                </td>
                <td className="p-4 align-middle hidden sm:table-cell">
                  {contact.source ? (
                    <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                      {contact.source}
                    </span>
                  ) : (
                    "—"
                  )}
                </td>
                <td className="p-4 align-middle hidden sm:table-cell">
                  <div className="flex gap-1 flex-wrap">
                    {contact.tags?.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                    {(!contact.tags || contact.tags.length === 0) && "—"}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
