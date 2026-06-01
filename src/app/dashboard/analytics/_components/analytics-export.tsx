"use client";

import { Button } from "@/components/ui/button";
import { Contact, Deal } from "@/lib/types";
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
    // In a real app, this might be a server-side generation for large datasets
    const dealRows = [
      [
        "Deal ID",
        "Title",
        "Value",
        "Status",
        "Close Date",
        "Contact ID",
        "Contact Name",
      ],
      ...deals.map((d) =>
        [
          d.id,
          d.title,
          d.value,
          d.status,
          d.close_date,
          d.contact_id,
          d.contact?.name,
        ].join(",")
      ),
    ];
    const contactRows = [
      ["Contact ID", "Name", "Email", "Company", "Source"],
      ...contacts.map((c) =>
        [c.id, c.name, c.email, c.company, c.source].join(",")
      ),
    ];

    const csvContent = `DEALS\n${dealRows.join('\n')}\n\nCONTACTS\n${contactRows.join('\n')}`;
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
