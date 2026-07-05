"use client";

import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
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

const ROW_HEIGHT = 48;
const TABLE_HEIGHT = 600;

export function ContactsTable({
  contacts,
  search,
  source,
  sort,
  order,
}: Props) {
  const baseParams = { search, source, sort, order };
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: contacts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
  });

  if (contacts.length === 0) {
    return (
      <div className="rounded-md border p-8 text-center text-muted-foreground">
        {search || source
          ? "No contacts match your filters."
          : "No contacts yet. Add your first contact to get started."}
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <table className="w-full caption-bottom text-sm">
        <thead>
          <tr className="border-b bg-muted/30">
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
      </table>

      <div
        ref={parentRef}
        className="overflow-auto"
        style={{ height: Math.min(TABLE_HEIGHT, contacts.length * ROW_HEIGHT + 2) }}
      >
        <table className="w-full caption-bottom text-sm">
          <tbody>
            <tr style={{ height: virtualizer.getTotalSize() }}>
              <td style={{ padding: 0 }} colSpan={6}>
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                  }}
                >
                  {virtualizer.getVirtualItems().map((virtualRow) => {
                    const contact = contacts[virtualRow.index];
                    return (
                      <div
                        key={contact.id}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          height: virtualRow.size,
                          transform: `translateY(${virtualRow.start}px)`,
                        }}
                        className="border-b"
                      >
                        <table className="w-full" style={{ tableLayout: "fixed" }}>
                          <tbody>
                            <tr className="h-12">
                              <td className="px-4 align-middle" style={{ width: "25%" }}>
                                <Link
                                  href={`/dashboard/contacts/${contact.id}`}
                                  className="font-medium hover:text-primary"
                                >
                                  {contact.name}
                                </Link>
                              </td>
                              <td className="px-4 align-middle text-muted-foreground whitespace-nowrap text-xs sm:text-sm" style={{ width: "15%" }}>
                                {new Date(contact.created_at).toLocaleDateString()}
                              </td>
                              <td className="px-4 align-middle text-muted-foreground hidden sm:table-cell" style={{ width: "15%" }}>
                                {contact.company || "—"}
                              </td>
                              <td className="px-4 align-middle hidden sm:table-cell" style={{ width: "20%" }}>
                                {contact.email || "—"}
                              </td>
                              <td className="px-4 align-middle hidden sm:table-cell" style={{ width: "10%" }}>
                                {contact.source ? (
                                  <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                                    {contact.source}
                                  </span>
                                ) : (
                                  "—"
                                )}
                              </td>
                              <td className="px-4 align-middle hidden sm:table-cell" style={{ width: "15%" }}>
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
                          </tbody>
                        </table>
                      </div>
                    );
                  })}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

