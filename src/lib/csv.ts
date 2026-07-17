/**
 * CSV safety helpers.
 *
 * Guards against two classes of problem when generating CSV that a user may
 * open in Excel / Google Sheets / LibreOffice:
 *
 *  1. CSV injection (a.k.a. formula injection): a cell whose text begins with
 *     =, +, -, @, tab or CR is interpreted as a formula by spreadsheet apps.
 *     A crafted contact name like `=HYPERLINK(...)` or `=cmd|...` can exfiltrate
 *     data or trigger code. We neutralise leading formula triggers with a `'`.
 *
 *  2. Delimiter/quote breakout: values containing commas, quotes or newlines
 *     must be quoted and have embedded quotes doubled, or they corrupt columns.
 */

const FORMULA_TRIGGERS = /^[=+\-@\t\r]/;

/** Escapes a single value for safe inclusion in a CSV cell. */
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
