import { describe, it, expect } from 'vitest';
import {
  normalizePhone,
  normalizeEmail,
  levenshteinDistance,
  stringSimilarity,
  jaroWinklerSimilarity,
  findDuplicateContacts,
  mergeContactData,
} from '../deduplication';
import { Contact } from '../db';

describe('Contact Deduplication Engine', () => {
  const baseContact: Contact = {
    id: 'contact-1',
    user_id: 'user-1',
    first_name: 'John',
    last_name: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1 (555) 123-4567',
    company: 'Acme Corporation',
    title: 'Chief Technology Officer',
    source: 'Manual',
    tags: ['Tech', 'VIP'],
    notes: 'Initial outreach note',
    is_opted_out: false,
    created_at: '2026-01-01T00:00:00.000Z',
  };

  describe('normalizePhone', () => {
    it('normalizes various phone number formats to standard digits', () => {
      expect(normalizePhone('+1 (555) 123-4567')).toBe('+15551234567');
      expect(normalizePhone('555-123-4567')).toBe('5551234567');
      expect(normalizePhone('555.123.4567')).toBe('5551234567');
      expect(normalizePhone('(555) 123 4567')).toBe('5551234567');
      expect(normalizePhone('+44 20 7946 0958')).toBe('+442079460958');
    });

    it('handles null, undefined, and empty string', () => {
      expect(normalizePhone(null)).toBe('');
      expect(normalizePhone(undefined)).toBe('');
      expect(normalizePhone('')).toBe('');
      expect(normalizePhone('   ')).toBe('');
    });
  });

  describe('normalizeEmail', () => {
    it('trims and lowercases emails', () => {
      expect(normalizeEmail('  John.Doe@Example.COM ')).toBe('john.doe@example.com');
      expect(normalizeEmail('ALICE@ACME.CO')).toBe('alice@acme.co');
    });

    it('handles null and undefined', () => {
      expect(normalizeEmail(null)).toBe('');
      expect(normalizeEmail(undefined)).toBe('');
    });
  });

  describe('levenshteinDistance & stringSimilarity', () => {
    it('computes distance for identical strings as 0 and similarity 1.0', () => {
      expect(levenshteinDistance('Acme', 'Acme')).toBe(0);
      expect(stringSimilarity('Acme', 'Acme')).toBe(1.0);
    });

    it('computes single edit distance', () => {
      expect(levenshteinDistance('Jon', 'John')).toBe(1);
      expect(levenshteinDistance('Smith', 'Smyth')).toBe(1);
    });

    it('computes similarity between 0 and 1', () => {
      const sim = stringSimilarity('Jonathan', 'Johnathan');
      expect(sim).toBeGreaterThan(0.85);
      expect(stringSimilarity('Apple', 'Zebra')).toBeLessThan(0.3);
    });

    it('handles empty inputs', () => {
      expect(levenshteinDistance('', '')).toBe(0);
      expect(stringSimilarity('', '')).toBe(1.0);
      expect(levenshteinDistance('abc', '')).toBe(3);
    });
  });

  describe('jaroWinklerSimilarity', () => {
    it('returns 1.0 for identical strings', () => {
      expect(jaroWinklerSimilarity('Michael', 'Michael')).toBe(1.0);
    });

    it('gives high score for matching prefix and small typo', () => {
      const sim = jaroWinklerSimilarity('Alexander', 'Alexandar');
      expect(sim).toBeGreaterThan(0.9);
    });

    it('returns 0 for completely disjoint strings', () => {
      expect(jaroWinklerSimilarity('abc', 'xyz')).toBe(0);
    });
  });

  describe('findDuplicateContacts', () => {
    const contactList: Contact[] = [
      baseContact,
      {
        ...baseContact,
        id: 'contact-2',
        first_name: 'Jane',
        last_name: 'Smith',
        email: 'jane.smith@globex.com',
        phone: '555-987-6543',
        company: 'Globex Inc',
      },
      {
        ...baseContact,
        id: 'contact-3',
        first_name: 'Robert',
        last_name: 'Johnson',
        email: 'robert@inGen.com',
        phone: '+1 555-555-0199',
        company: 'InGen',
      },
    ];

    it('detects duplicate by exact email with 100% confidence', () => {
      const duplicates = findDuplicateContacts(
        { email: 'JOHN.DOE@example.com', first_name: 'Johnny' },
        contactList
      );

      expect(duplicates).toHaveLength(1);
      expect(duplicates[0].existingContact.id).toBe('contact-1');
      expect(duplicates[0].confidenceScore).toBe(100);
      expect(duplicates[0].reason).toBe('exact_email');
    });

    it('detects duplicate by normalized phone with high confidence', () => {
      const duplicates = findDuplicateContacts(
        { phone: '555-123-4567', first_name: 'J.', last_name: 'Doe' },
        contactList
      );

      expect(duplicates.length).toBeGreaterThanOrEqual(1);
      const phoneMatch = duplicates.find(d => d.reason === 'normalized_phone');
      expect(phoneMatch).toBeDefined();
      expect(phoneMatch!.confidenceScore).toBe(95);
      expect(phoneMatch!.existingContact.id).toBe('contact-1');
    });

    it('detects duplicate by exact name and company', () => {
      const duplicates = findDuplicateContacts(
        { first_name: 'Jane', last_name: 'Smith', company: 'Globex Inc' },
        contactList
      );

      expect(duplicates.length).toBeGreaterThanOrEqual(1);
      expect(duplicates[0].existingContact.id).toBe('contact-2');
      expect(duplicates[0].reason).toBe('exact_name_and_company');
      expect(duplicates[0].confidenceScore).toBe(90);
    });

    it('detects duplicate by fuzzy name and matching company', () => {
      const duplicates = findDuplicateContacts(
        { first_name: 'Jon', last_name: 'Doe', company: 'Acme Corporation' },
        contactList
      );

      expect(duplicates.length).toBeGreaterThanOrEqual(1);
      expect(duplicates[0].existingContact.id).toBe('contact-1');
      expect(duplicates[0].confidenceScore).toBeGreaterThanOrEqual(80);
    });

    it('returns empty array when candidate is completely unique', () => {
      const duplicates = findDuplicateContacts(
        {
          first_name: 'Bruce',
          last_name: 'Wayne',
          email: 'bruce@wayneenterprises.com',
          phone: '555-000-0000',
          company: 'Wayne Enterprises',
        },
        contactList
      );

      expect(duplicates).toHaveLength(0);
    });
  });

  describe('mergeContactData', () => {
    it('merges new fields into existing contact preserving non-empty fields', () => {
      const updated = mergeContactData(baseContact, {
        title: 'VP of Engineering',
        phone: '+1 555-999-8888',
      });

      expect(updated.first_name).toBe('John');
      expect(updated.last_name).toBe('Doe');
      expect(updated.email).toBe('john.doe@example.com');
      expect(updated.company).toBe('Acme Corporation');
      expect(updated.title).toBe('VP of Engineering');
      expect(updated.phone).toBe('+1 555-999-8888');
    });

    it('unions and deduplicates tags', () => {
      const updated = mergeContactData(baseContact, {
        tags: ['VIP', 'Enterprise', 'SaaS'],
      });

      expect(updated.tags).toEqual(['Tech', 'VIP', 'Enterprise', 'SaaS']);
    });

    it('appends notes with separator if different', () => {
      const updated = mergeContactData(baseContact, {
        notes: 'Followed up via phone call on Tuesday.',
      });

      expect(updated.notes).toContain('Initial outreach note');
      expect(updated.notes).toContain('Followed up via phone call on Tuesday.');
    });

    it('does not duplicate identical notes', () => {
      const updated = mergeContactData(baseContact, {
        notes: 'Initial outreach note',
      });

      expect(updated.notes).toBe('Initial outreach note');
    });
  });
});
