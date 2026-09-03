import { describe, it, expect } from 'vitest';
import {
  signInSchema,
  signUpSchema,
  dealIdSchema,
  contactIdSchema,
  writeEmailSchema,
  apiKeySchema,
  webhookSchema,
  validateBody,
} from '../validation';
import { NextResponse } from 'next/server';

describe('Validation Schemas & Helpers', () => {
  describe('signInSchema', () => {
    it('accepts valid credentials', () => {
      const valid = { email: 'user@example.com', password: 'password123' };
      const parsed = signInSchema.safeParse(valid);
      expect(parsed.success).toBe(true);
    });

    it('rejects invalid emails', () => {
      const invalid = { email: 'not-an-email', password: 'password123' };
      const parsed = signInSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });

    it('rejects passwords shorter than 8 characters', () => {
      const invalid = { email: 'user@example.com', password: '123' };
      const parsed = signInSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });
  });

  describe('signUpSchema', () => {
    it('accepts valid registration data', () => {
      const valid = { email: 'founder@startup.io', fullName: 'Jane Founder', password: 'securePassword!' };
      const parsed = signUpSchema.safeParse(valid);
      expect(parsed.success).toBe(true);
    });

    it('rejects short full names', () => {
      const invalid = { email: 'founder@startup.io', fullName: 'J', password: 'securePassword!' };
      const parsed = signUpSchema.safeParse(invalid);
      expect(parsed.success).toBe(false);
    });
  });

  describe('dealIdSchema & contactIdSchema', () => {
    it('accepts valid UUIDs', () => {
      const validUuid = '123e4567-e89b-12d3-a456-426614174000';
      expect(dealIdSchema.safeParse({ dealId: validUuid }).success).toBe(true);
      expect(contactIdSchema.safeParse({ contactId: validUuid }).success).toBe(true);
    });

    it('rejects non-UUID strings', () => {
      expect(dealIdSchema.safeParse({ dealId: 'deal-123' }).success).toBe(false);
      expect(contactIdSchema.safeParse({ contactId: 'not-a-uuid' }).success).toBe(false);
    });
  });

  describe('writeEmailSchema', () => {
    it('accepts valid prompt with contactId', () => {
      const valid = {
        contactId: '123e4567-e89b-12d3-a456-426614174000',
        prompt: 'Draft an email offering our Q3 discount',
      };
      expect(writeEmailSchema.safeParse(valid).success).toBe(true);
    });

    it('rejects empty prompt', () => {
      const invalid = {
        contactId: '123e4567-e89b-12d3-a456-426614174000',
        prompt: '',
      };
      expect(writeEmailSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe('apiKeySchema', () => {
    it('accepts valid name', () => {
      expect(apiKeySchema.safeParse({ name: 'Production Extension Key' }).success).toBe(true);
    });

    it('rejects empty name', () => {
      expect(apiKeySchema.safeParse({ name: '' }).success).toBe(false);
    });
  });

  describe('webhookSchema', () => {
    it('accepts valid webhook URL and allowed events', () => {
      const valid = {
        url: 'https://webhook.site/abc-123',
        events: ['deal.created', 'deal.won'],
      };
      expect(webhookSchema.safeParse(valid).success).toBe(true);
    });

    it('rejects invalid event names', () => {
      const invalid = {
        url: 'https://webhook.site/abc-123',
        events: ['invalid.event.name'],
      };
      expect(webhookSchema.safeParse(invalid).success).toBe(false);
    });

    it('rejects empty event lists', () => {
      const invalid = {
        url: 'https://webhook.site/abc-123',
        events: [],
      };
      expect(webhookSchema.safeParse(invalid).success).toBe(false);
    });

    it('rejects non-URL strings', () => {
      const invalid = {
        url: 'not-a-valid-url',
        events: ['deal.created'],
      };
      expect(webhookSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe('validateBody helper', () => {
    it('returns parsed data on valid input', () => {
      const result = validateBody({ name: 'Integration Key' }, apiKeySchema);
      expect(result).toEqual({ name: 'Integration Key' });
    });

    it('returns 400 NextResponse on invalid input', () => {
      const result = validateBody({ name: '' }, apiKeySchema);
      expect(result).toBeInstanceOf(NextResponse);
    });
  });
});
