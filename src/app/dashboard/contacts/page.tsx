import { createClient } from "@/lib/supabase/server";
import { ContactFilters } from "./_components/contact-filters";
import { ContactsTable } from "./_components/contacts-table";
import Link from "next/link";

const SORTABLE = ["name", "created_at", "company"] as const;

interface Props {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ContactsPage({ searchParams }: Props) {
  const params = await searchParams;
  const supabase = await createClient();

  const search = typeof params.search === "string" ? params.search : "";
  const source = typeof params.source === "string" ? params.source : "";
  const sort = (
    typeof params.sort === "string" && (SORTABLE as readonly string[]).includes(params.sort)
      ? params.sort
      : "created_at"
  ) as "name" | "created_at" | "company";
  const order = typeof params.order === "string" && params.order === "asc" ? "asc" : "desc";

  let query = supabase.from("contacts").select("*");

  if (search) {
    const escaped = search.replace(/[%_\\]/g, "\\$&");
    query = query.or(
      `name.ilike.*${escaped}*,email.ilike.*${escaped}*,company.ilike.*${escaped}*`
    );
  }

  if (source && ["cold", "referral", "inbound"].includes(source)) {
    query = query.eq("source", source);
  }

  const { data: contacts, error } = await query.order(sort, {
    ascending: order === "asc",
  });

  if (error) {
    console.error("Error fetching contacts:", error);
  }

  const contactsList = contacts || [];

  return (
    <div className="p-4 md:p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Contacts</h1>
          <p className="text-muted-foreground mt-1">
            {contactsList.length} contact{contactsList.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/contacts/import"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background h-10 px-3 md:px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            <span className="hidden sm:inline">Import</span>
            <span className="sm:hidden">Imp</span>
          </Link>
          <Link
            href="/dashboard/contacts/new"
            className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground h-10 px-3 md:px-4 py-2 text-sm font-medium hover:bg-primary/90"
          >
            <span className="hidden sm:inline">Add Contact</span>
            <span className="sm:hidden">+ Add</span>
          </Link>
        </div>
      </div>

      <ContactFilters />

      <ContactsTable
        contacts={contactsList}
        search={search}
        source={source}
        sort={sort}
        order={order}
      />
    </div>
  );
}
