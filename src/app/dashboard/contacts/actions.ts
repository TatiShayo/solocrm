"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

interface ContactFormData {
  name: string;
  email: string;
  phone?: string | undefined;
  company?: string | undefined;
  title?: string | undefined;
  source?: "cold" | "referral" | "inbound" | "";
  tags?: string | undefined;
  notes?: string | undefined;
}

export async function saveContact(formData: ContactFormData, contactId?: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const tags = formData.tags
    ? formData.tags
        .split(",")
        .map((t: string) => t.trim())
        .filter(Boolean)
    : [];

  const source =
    formData.source && ["cold", "referral", "inbound"].includes(formData.source)
      ? (formData.source as "cold" | "referral" | "inbound")
      : null;

  const payload = {
    user_id: user.id,
    name: formData.name.trim(),
    email: (formData.email ?? "").trim() || null,
    phone: (formData.phone ?? "").trim() || null,
    company: (formData.company ?? "").trim() || null,
    title: (formData.title ?? "").trim() || null,
    source,
    tags: tags.length > 0 ? tags : null,
    notes: (formData.notes ?? "").trim() || null,
  };

  // Duplicate email check
  if (payload.email) {
    const { data: existing } = await supabase
      .from("contacts")
      .select("id")
      .eq("email", payload.email)
      .neq("id", contactId || "")
      .single();

    if (existing) {
      return {
        error: "A contact with this email already exists.",
        field: "email",
      };
    }
  }

  if (contactId) {
    const { error } = await supabase
      .from("contacts")
      .update(payload)
      .eq("id", contactId);

    if (error) {
      return { error: error.message };
    }
  } else {
    const { error } = await supabase
      .from("contacts")
      .insert(payload);

    if (error) {
      return { error: error.message };
    }
  }

  revalidatePath("/dashboard/contacts");
  redirect("/dashboard/contacts");
}
