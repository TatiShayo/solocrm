/**
 * CSV Import Diff & Deduplication Preview Utility for SoloCRM.
 * Generates an actionable diff report before committing bulk CSV imports.
 */

import { sanitizeCsvCell } from "./csv";

export interface ContactRecord {
  id?: string;
  name: string;
  email: string;
  company?: string;
  phone?: string;
}

export type ImportDiffAction = "NEW" | "UPDATE" | "DUPLICATE_IDENTICAL" | "INVALID";

export interface RowDiffResult {
  action: ImportDiffAction;
  incoming: ContactRecord;
  existing?: ContactRecord;
  changedFields?: string[];
  error?: string;
}

export function computeCsvImportDiff(
  incomingRows: Array<Record<string, unknown>>,
  existingContacts: ContactRecord[]
): RowDiffResult[] {
  const existingMap = new Map<string, ContactRecord>();
  for (const c of existingContacts) {
    if (c.email) {
      existingMap.set(c.email.trim().toLowerCase(), c);
    }
  }

  const results: RowDiffResult[] = [];

  for (const row of incomingRows) {
    const rawEmail = String(row.email || row.Email || "").trim().toLowerCase();
    const cleanEmail = sanitizeCsvCell(rawEmail);
    const cleanName = sanitizeCsvCell(row.name || row.Name || "");
    const cleanCompany = sanitizeCsvCell(row.company || row.Company || "");
    const cleanPhone = sanitizeCsvCell(row.phone || row.Phone || "");

    if (!cleanEmail || !cleanEmail.includes("@")) {
      results.push({
        action: "INVALID",
        incoming: { name: cleanName, email: cleanEmail },
        error: "Missing or invalid email address",
      });
      continue;
    }

    const incoming: ContactRecord = {
      name: cleanName,
      email: cleanEmail,
      company: cleanCompany,
      phone: cleanPhone,
    };

    const existing = existingMap.get(cleanEmail);

    if (!existing) {
      results.push({
        action: "NEW",
        incoming,
      });
      continue;
    }

    const changedFields: string[] = [];
    if (cleanName && cleanName !== existing.name) changedFields.push("name");
    if (cleanCompany && cleanCompany !== (existing.company || "")) changedFields.push("company");
    if (cleanPhone && cleanPhone !== (existing.phone || "")) changedFields.push("phone");

    if (changedFields.length === 0) {
      results.push({
        action: "DUPLICATE_IDENTICAL",
        incoming,
        existing,
      });
    } else {
      results.push({
        action: "UPDATE",
        incoming,
        existing,
        changedFields,
      });
    }
  }

  return results;
}
