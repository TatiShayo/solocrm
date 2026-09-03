import { describe, it, expect } from 'vitest';
import {
  escapeCsvValue,
  toCsvRow,
  toCsv,
  isFormulaInjection,
  sanitizeCsvCell,
  normalizeHeader,
  autoMapHeaders,
  parseAndSanitizeContactsCsv,
} from '../csv';

describe('CSV Formula Injection Prevention & Sanitization', () => {
  describe('isFormulaInjection', () => {
    it('detects formula injection triggers (=, +, -, @, \\t, \\r)', () => {
      expect(isFormulaInjection('=CMD|\' /C calc\'!A0')).toBe(true);
      expect(isFormulaInjection('=SUM(A1:A10)')).toBe(true);
      expect(isFormulaInjection('+12345')).toBe(true);
      expect(isFormulaInjection('-12345')).toBe(true);
      expect(isFormulaInjection('@HYPERLINK("http://evil.com")')).toBe(true);
      expect(isFormulaInjection('\tcalc')).toBe(true);
      expect(isFormulaInjection('\rcalc')).toBe(true);
    });

    it('returns false for benign text', () => {
      expect(isFormulaInjection('Alice Smith')).toBe(false);
      expect(isFormulaInjection('alice@example.com')).toBe(false);
      expect(isFormulaInjection('Acme Corp, Inc.')).toBe(false);
      expect(isFormulaInjection(null)).toBe(false);
      expect(isFormulaInjection(undefined)).toBe(false);
      expect(isFormulaInjection('')).toBe(false);
    });
  });

  describe('sanitizeCsvCell', () => {
    it('strips leading formula triggers from input cells', () => {
      expect(sanitizeCsvCell('=CMD|\' /C calc\'!A0')).toBe("CMD|' /C calc'!A0");
      expect(sanitizeCsvCell('===1+1')).toBe('1+1');
      expect(sanitizeCsvCell('@test')).toBe('test');
      expect(sanitizeCsvCell('+1-555-0101')).toBe('1-555-0101');
      expect(sanitizeCsvCell('-100')).toBe('100');
    });

    it('removes null bytes and control characters', () => {
      expect(sanitizeCsvCell('Hello\x00World\x08')).toBe('HelloWorld');
    });

    it('preserves clean strings and handles null/undefined', () => {
      expect(sanitizeCsvCell('Bob Jones')).toBe('Bob Jones');
      expect(sanitizeCsvCell(null)).toBe('');
      expect(sanitizeCsvCell(undefined)).toBe('');
      expect(sanitizeCsvCell(12345)).toBe('12345');
    });
  });

  describe('escapeCsvValue (Export)', () => {
    it('prefixes formula triggers with a single quote', () => {
      expect(escapeCsvValue('=1+1')).toBe("'=1+1");
      expect(escapeCsvValue('@admin')).toBe("'@admin");
      expect(escapeCsvValue('+44')).toBe("'+44");
    });

    it('wraps in double quotes and doubles embedded quotes if special chars present', () => {
      expect(escapeCsvValue('Hello, World')).toBe('"Hello, World"');
      expect(escapeCsvValue('Quote "here"')).toBe('"Quote ""here"""');
      expect(escapeCsvValue('Line 1\nLine 2')).toBe('"Line 1\nLine 2"');
    });

    it('returns empty string for null and undefined', () => {
      expect(escapeCsvValue(null)).toBe('');
      expect(escapeCsvValue(undefined)).toBe('');
    });
  });

  describe('toCsvRow & toCsv', () => {
    it('builds a single CSV row', () => {
      const row = toCsvRow(['John', 'Doe', 'john@acme.com', '=1+1']);
      expect(row).toContain('John,Doe,john@acme.com');
    });

    it('builds a multi-line CSV document', () => {
      const header = ['First Name', 'Last Name', 'Email'];
      const rows = [
        ['Alice', 'Smith', 'alice@acme.com'],
        ['Bob', 'Jones, Jr.', 'bob@globex.com'],
      ];
      const csv = toCsv(header, rows);
      expect(csv).toContain('First Name,Last Name,Email');
      expect(csv).toContain('Alice,Smith,alice@acme.com');
      expect(csv).toContain('Bob,"Jones, Jr.",bob@globex.com');
    });
  });

  describe('normalizeHeader', () => {
    it('strips whitespace, symbols, and lowercases', () => {
      expect(normalizeHeader(' First Name ')).toBe('firstname');
      expect(normalizeHeader('e_mail-address')).toBe('emailaddress');
      expect(normalizeHeader('Phone #')).toBe('phone');
      expect(normalizeHeader('Job_Title')).toBe('jobtitle');
    });

    it('strips UTF-8 BOM prefix', () => {
      expect(normalizeHeader('\uFEFFFirst Name')).toBe('firstname');
    });

    it('handles empty strings', () => {
      expect(normalizeHeader('')).toBe('');
    });
  });

  describe('autoMapHeaders', () => {
    it('auto-maps common column variants correctly', () => {
      const headers = ['First Name', 'Surname', 'E-Mail', 'Mobile Phone', 'Organization', 'Position', 'Lead Source', 'Tags', 'Comments'];
      const mapping = autoMapHeaders(headers);

      expect(mapping.first_name).toBe('First Name');
      expect(mapping.last_name).toBe('Surname');
      expect(mapping.email).toBe('E-Mail');
      expect(mapping.phone).toBe('Mobile Phone');
      expect(mapping.company).toBe('Organization');
      expect(mapping.title).toBe('Position');
      expect(mapping.source).toBe('Lead Source');
      expect(mapping.tags).toBe('Tags');
      expect(mapping.notes).toBe('Comments');
    });

    it('maps full name column if separate first/last are absent', () => {
      const headers = ['Full Name', 'Email', 'Company'];
      const mapping = autoMapHeaders(headers);
      expect(mapping.first_name).toBe('Full Name');
      expect(mapping.email).toBe('Email');
    });
  });

  describe('parseAndSanitizeContactsCsv', () => {
    it('parses valid CSV and sanitizes formula injection cells', () => {
      const csvContent = `First Name,Last Name,Email,Company,Phone
=CMD|' /C calc'!A0,Smith,alice@acme.com,@AcmeCorp,+1-555-0101
Bob,Jones,bob@globex.com,Globex Inc,555-0102`;

      const result = parseAndSanitizeContactsCsv(csvContent);
      expect(result.errors).toHaveLength(0);
      expect(result.rows).toHaveLength(2);

      const [row1, row2] = result.rows;
      expect(row1.first_name).toBe("CMD|' /C calc'!A0"); // Sanitized (formula trigger stripped)
      expect(row1.company).toBe('AcmeCorp');             // Sanitized (@ stripped)
      expect(row1.phone).toBe('1-555-0101');              // Sanitized (+ stripped)
      expect(row1.email).toBe('alice@acme.com');

      expect(row2.first_name).toBe('Bob');
      expect(row2.last_name).toBe('Jones');
      expect(row2.email).toBe('bob@globex.com');
    });

    it('splits combined full name when only Full Name header is provided', () => {
      const csvContent = `Full Name,Email,Company
Peter Benjamin Parker,peter@dailybugle.com,Daily Bugle
Bruce Wayne,bruce@wayne.corp,Wayne Enterprises`;

      const result = parseAndSanitizeContactsCsv(csvContent);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0].first_name).toBe('Peter');
      expect(result.rows[0].last_name).toBe('Benjamin Parker');
      expect(result.rows[1].first_name).toBe('Bruce');
      expect(result.rows[1].last_name).toBe('Wayne');
    });

    it('parses multi-tag strings split by commas, semicolons, or pipes', () => {
      const csvContent = `First Name,Last Name,Tags
Diana,Prince,"VIP, Enterprise; Non-Profit | SaaS"`;

      const result = parseAndSanitizeContactsCsv(csvContent);
      expect(result.rows[0].tags).toEqual(['VIP', 'Enterprise', 'Non-Profit', 'SaaS']);
    });

    it('skips completely blank rows gracefully', () => {
      const csvContent = `First Name,Last Name,Email
Alice,Smith,alice@acme.com


Bob,Jones,bob@globex.com
`;
      const result = parseAndSanitizeContactsCsv(csvContent);
      expect(result.rows).toHaveLength(2);
    });
  });
});
