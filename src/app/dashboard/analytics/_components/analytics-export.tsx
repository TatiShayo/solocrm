"use client";

import { Button } from "@/components/ui/button";
import { Contact, Deal } from "@/lib/types";
import { toCsv } from "@/lib/csv";
import { Download } from "lucide-react";

interface AnalyticsExportProps {
  deals: Deal[];
  contacts: Contact[];
}

export default function AnalyticsExport({
  deals,
  contacts,
}: AnalyticsExportProps) {
  const handleExport = () => {
    // Values are escaped to prevent CSV/formula injection and delimiter breakout.
    const dealsCsv = toCsv(
      ["Deal ID", "Title", "Value", "Status", "Close Date", "Contact ID", "Contact Name"],
      deals.map((d) => [
        d.id,
        d.title,
        d.value,
        d.status,
        d.close_date,
        d.contact_id,
        d.contact?.name,
      ])
    );
    const contactsCsv = toCsv(
      ["Contact ID", "Name", "Email", "Company", "Source"],
      contacts.map((c) => [c.id, c.name, c.email, c.company, c.source])
    );

    const csvContent = `DEALS\n${dealsCsv}\n\nCONTACTS\n${contactsCsv}`;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "analytics_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Button onClick={handleExport} variant="outline">
      <Download className="mr-2 h-4 w-4" />
      Export CSV
    </Button>
  );
}
