"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import Papa from "papaparse";

export interface ParseResult {
  headers: string[];
  rows: Record<string, string>[];
  fileName: string;
  rowCount: number;
}

export async function parseCSVFile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const file = formData.get("file") as File;
  if (!file) {
    return { error: "No file provided." };
  }

  if (!file.name.endsWith(".csv")) {
    return { error: "Please upload a CSV file." };
  }

  const text = await file.text();

  try {
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
    });

    if (parsed.errors.length > 0) {
      return { error: `CSV parse error: ${parsed.errors[0].message}` };
    }

    if (parsed.data.length === 0) {
      return { error: "The CSV file is empty or has no data rows." };
    }

    const result: ParseResult = {
      headers: parsed.meta.fields || [],
      rows: parsed.data,
      fileName: file.name,
      rowCount: parsed.data.length,
    };

    return { data: result };
  } catch (err) {
    return { error: "Failed to parse CSV file." };
  }
}

export async function importContacts(
  columnMap: Record<string, string>,
  rows: Record<string, string>[]
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const fieldMap: Record<string, string> = {
    name: "name",
    email: "email",
    phone: "phone",
    company: "company",
    title: "title",
    source: "source",
    tags: "tags",
    notes: "notes",
  };

  const mapped = rows.map((row) => {
    const contact: Record<string, unknown> = {
      user_id: user.id,
      name: "",
    };

    for (const [csvCol, dbField] of Object.entries(columnMap)) {
      const field = fieldMap[dbField];
      if (!field) continue;
      const value = row[csvCol] || "";

      if (field === "tags") {
        contact.tags = value
          ? String(value)
              .split(",")
              .map((t: string) => t.trim())
              .filter(Boolean)
          : null;
      } else if (field === "source") {
        const s = String(value).trim().toLowerCase();
        contact.source =
          ["cold", "referral", "inbound"].includes(s) ? s : null;
      } else {
        contact[field] = String(value).trim() || (field === "name" ? "Unnamed" : null);
      }
    }

    return contact;
  });

  const filtered = mapped.filter((c) => c.name && c.name !== "Unnamed");

  if (filtered.length === 0) {
    return { error: "No contacts to import. Make sure at least the Name column is mapped." };
  }

  const { error } = await supabase.from("contacts").insert(filtered);

  if (error) {
    return { error: `Import failed: ${error.message}` };
  }

  revalidatePath("/dashboard/contacts");
  redirect("/dashboard/contacts");
}
