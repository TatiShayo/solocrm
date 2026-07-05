import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { ContactForm } from "../../_components/contact-form";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditContactPage({ params }: Props) {
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

  return (
    <div className="p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/dashboard/contacts"
          className="inline-flex items-center justify-center rounded-md border border-input bg-background h-8 w-8 hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Edit Contact</h1>
          <p className="text-muted-foreground mt-1">Update {contact.name}</p>
        </div>
      </div>

      <ContactForm contact={contact} />
    </div>
  );
}
