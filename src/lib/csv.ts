/**
 * CSV safety & parsing helpers.
 *
 * Guards against:
 *  1. CSV injection (Formula injection / DDE): cells starting with =, +, -, @, \t, \r, cmd| etc.
 *  2. Delimiter & quote breakouts when exporting.
 *  3. Header variation & dirty CSV inputs during contact import.
 */

import Papa from 'papaparse';

export const FORMULA_TRIGGERS = /^[=+\-@\t\r]/;
export const MALICIOUS_DDE_PATTERN = /^[=+\-@\t\r]\s*(cmd|powershell|mshta|calc|wscript|cscript|regsvr32|rundll32|certutil)/i;

/** Checks if a string value is potentially a malicious formula or DDE command */
export function isFormulaInjection(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  const str = String(value);
  return FORMULA_TRIGGERS.test(str);
}

/**
 * Sanitizes a cell value when importing or displaying untrusted user input.
 * Strips dangerous formula execution prefixes or neutralizes them.
 */
export function sanitizeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let str = String(value).trim();

  // If starts with formula trigger characters, strip or neutralize dangerous trigger
  while (FORMULA_TRIGGERS.test(str)) {
    str = str.replace(/^[=+\-@\t\r]+/, "").trim();
  }

  // Remove any null bytes or control characters
  str = str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  return str;
}

/** Escapes a single value for safe inclusion in a CSV cell on export. */
export function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) return "";

  let str = String(value);

  // Neutralise formula injection by prefixing a single quote.
  if (FORMULA_TRIGGERS.test(str)) {
    str = "'" + str;
  }

  // Quote if the value contains a delimiter, quote, or newline.
  if (/[",\n\r]/.test(str)) {
    str = '"' + str.replace(/"/g, '""') + '"';
  }

  return str;
}

/** Builds a single CSV line from an array of raw values. */
export function toCsvRow(values: unknown[]): string {
  return values.map(escapeCsvValue).join(",");
}

/** Builds a full CSV document from a header row and data rows. */
export function toCsv(header: string[], rows: unknown[][]): string {
  return [toCsvRow(header), ...rows.map(toCsvRow)].join("\n");
}

/**
 * Normalizes a CSV header string by trimming, lowercasing, and stripping punctuation/symbols.
 */
export function normalizeHeader(header: string): string {
  if (!header) return "";
  return header
    .trim()
    .toLowerCase()
    .replace(/^[\uFEFF\xEF\xBB\xBF]+/, "") // Strip UTF-8 BOM
    .replace(/[^a-z0-9]/g, "");
}

export interface HeaderMappingDefinition {
  field: string;
  aliases: string[];
}

export const STANDARD_CONTACT_FIELDS: HeaderMappingDefinition[] = [
  { field: 'first_name', aliases: ['firstname', 'first', 'givenname', 'fname', 'namefirst'] },
  { field: 'last_name', aliases: ['lastname', 'last', 'surname', 'familyname', 'lname', 'namelast'] },
  { field: 'name', aliases: ['fullname', 'contactname', 'name', 'personname', 'displayname'] },
  { field: 'email', aliases: ['email', 'emailaddress', 'mail', 'contactemail', 'primaryemail', 'e_mail'] },
  { field: 'phone', aliases: ['phone', 'phonenumber', 'mobile', 'mobilephone', 'cell', 'cellphone', 'telephone', 'telephonenumber', 'tel', 'workphone', 'homephone'] },
  { field: 'company', aliases: ['company', 'companyname', 'organization', 'org', 'business', 'employer', 'account'] },
  { field: 'title', aliases: ['title', 'jobtitle', 'position', 'role', 'occupation', 'designation'] },
  { field: 'source', aliases: ['source', 'leadsource', 'origin', 'acquisition', 'channel'] },
  { field: 'tags', aliases: ['tags', 'tag', 'categories', 'labels', 'segment', 'segments', 'groups'] },
  { field: 'notes', aliases: ['notes', 'note', 'comments', 'comment', 'description', 'memo', 'details'] },
];

/**
 * Automatically maps an array of raw CSV headers to standard contact fields.
 */
export function autoMapHeaders(headers: string[]): Record<string, string> {
  const result: Record<string, string> = {
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company: '',
    title: '',
    source: '',
    tags: '',
    notes: '',
  };

  const normalizedHeaders = headers.map(h => ({
    original: h,
    normalized: normalizeHeader(h)
  }));

  for (const def of STANDARD_CONTACT_FIELDS) {
    // Exact normalized match or alias match
    const match = normalizedHeaders.find(h => {
      if (h.normalized === def.field) return true;
      return def.aliases.includes(h.normalized);
    });

    if (match) {
      if (def.field === 'name') {
        // If full name found and first_name not yet set, we can map to first_name or handle split
        if (!result.first_name) {
          result.first_name = match.original;
        }
      } else {
        result[def.field] = match.original;
      }
    }
  }

  return result;
}

export interface ParsedContactRow {
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  title: string | null;
  source: string;
  tags: string[];
  notes: string | null;
}

export interface ParseCsvResult {
  rows: ParsedContactRow[];
  headers: string[];
  errors: string[];
  totalParsed: number;
}

/**
 * Parses raw CSV string or rows into sanitized contact objects.
 */
export function parseAndSanitizeContactsCsv(
  csvText: string,
  customMapping?: Record<string, string>
): ParseCsvResult {
  const errors: string[] = [];
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.trim().replace(/^[\uFEFF\xEF\xBB\xBF]+/, ""),
  });

  if (parsed.errors && parsed.errors.length > 0) {
    for (const err of parsed.errors) {
      errors.push(`Row ${err.row ?? 'unknown'}: ${err.message}`);
    }
  }

  const rawHeaders = parsed.meta.fields || [];
  const mapping = customMapping || autoMapHeaders(rawHeaders);

  const rows: ParsedContactRow[] = [];

  for (const rawRow of parsed.data) {
    if (!rawRow || Object.keys(rawRow).length === 0) continue;

    const getVal = (field: string): string => {
      const col = mapping[field];
      const val = col ? rawRow[col] : (rawRow[field] ?? '');
      return sanitizeCsvCell(val);
    };

    let firstName = getVal('first_name');
    let lastName = getVal('last_name');

    // If only full name was mapped and first/last are combined
    if (firstName && !lastName && (firstName.includes(' ') || rawHeaders.some(h => normalizeHeader(h) === 'name' || normalizeHeader(h) === 'fullname'))) {
      const parts = firstName.split(/\s+/);
      firstName = parts[0] || '';
      lastName = parts.slice(1).join(' ') || '';
    }

    const emailRaw = getVal('email');
    const email = emailRaw && emailRaw.includes('@') ? emailRaw.toLowerCase() : (emailRaw || null);
    const phone = getVal('phone') || null;
    const company = getVal('company') || null;
    const title = getVal('title') || null;
    const source = getVal('source') || 'CSV Import';
    const notes = getVal('notes') || null;

    const tagsRaw = getVal('tags');
    let tags: string[] = [];
    if (tagsRaw) {
      tags = tagsRaw
        .split(/[,;|]/)
        .map(t => sanitizeCsvCell(t))
        .filter(t => t.length > 0);
    }

    if (firstName || lastName || email || company) {
      rows.push({
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        company,
        title,
        source,
        tags,
        notes,
      });
    }
  }

  return {
    rows,
    headers: rawHeaders,
    errors,
    totalParsed: rows.length,
  };
}
