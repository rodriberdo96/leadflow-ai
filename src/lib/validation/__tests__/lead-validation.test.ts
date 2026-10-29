import { describe, it, expect } from 'vitest';
import { leadSchema, isValidDateString } from '../lead';

describe('Lead Zod Validation & Schema Hardening (Phase 4)', () => {
  const validBasePayload = {
    name: 'Sarah Jenkins',
    company: 'Apex Digital Retail',
    email: 'sarah@apexretail.io',
    phone: '+1 (415) 890-2341',
    service: 'Web Development',
    source: 'Website Form',
    status: 'new',
    deal_value: 8500,
    next_follow_up: '2026-10-27',
    notes: 'Looking for a headless store migration.',
  };

  it('validates a complete valid lead successfully', () => {
    const result = leadSchema.safeParse(validBasePayload);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Sarah Jenkins');
      expect(result.data.deal_value).toBe(8500);
      expect(result.data.status).toBe('new');
    }
  });

  describe('deal_value validation', () => {
    it('rejects negative deal values', () => {
      const result = leadSchema.safeParse({ ...validBasePayload, deal_value: -100 });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toMatch(/must be 0 or greater/i);
      }
    });

    it('rejects NaN deal values', () => {
      const result = leadSchema.safeParse({ ...validBasePayload, deal_value: 'not-a-number' });
      expect(result.success).toBe(false);
    });

    it('rejects Infinity and -Infinity', () => {
      const posInf = leadSchema.safeParse({ ...validBasePayload, deal_value: Infinity });
      expect(posInf.success).toBe(false);

      const negInf = leadSchema.safeParse({ ...validBasePayload, deal_value: -Infinity });
      expect(negInf.success).toBe(false);
    });

    it('rejects values exceeding max database constraint of $999,999,999.99', () => {
      const result = leadSchema.safeParse({ ...validBasePayload, deal_value: 1000000000 });
      expect(result.success).toBe(false);
    });

    it('accepts 0, positive integers, and decimal values', () => {
      expect(leadSchema.safeParse({ ...validBasePayload, deal_value: 0 }).success).toBe(true);
      expect(leadSchema.safeParse({ ...validBasePayload, deal_value: '2500' }).success).toBe(true);
      expect(leadSchema.safeParse({ ...validBasePayload, deal_value: 1250.50 }).success).toBe(true);
    });
  });

  describe('next_follow_up and calendar date validation', () => {
    it('accepts valid YYYY-MM-DD dates', () => {
      expect(isValidDateString('2026-10-27')).toBe(true);
      expect(isValidDateString('2026-02-28')).toBe(true);
      expect(leadSchema.safeParse({ ...validBasePayload, next_follow_up: '2026-10-27' }).success).toBe(true);
    });

    it('accepts empty string and null/undefined as optional follow-ups', () => {
      expect(isValidDateString('')).toBe(true);
      expect(isValidDateString(null)).toBe(true);
      expect(isValidDateString(undefined)).toBe(true);
      expect(leadSchema.safeParse({ ...validBasePayload, next_follow_up: '' }).success).toBe(true);
    });

    it('rejects impossible calendar dates like February 30 or April 31', () => {
      expect(isValidDateString('2026-02-30')).toBe(false);
      expect(isValidDateString('2026-04-31')).toBe(false);
      expect(isValidDateString('2026-13-01')).toBe(false);
      expect(isValidDateString('2026-00-10')).toBe(false);

      const result = leadSchema.safeParse({ ...validBasePayload, next_follow_up: '2026-02-30' });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toMatch(/valid calendar date/i);
      }
    });

    it('rejects malformed date strings', () => {
      expect(isValidDateString('random-string')).toBe(false);
      expect(isValidDateString('2026/10/27')).toBe(false);
    });
  });

  describe('field lengths and constraints', () => {
    it('rejects contact name shorter than 2 characters or longer than 100 characters', () => {
      expect(leadSchema.safeParse({ ...validBasePayload, name: 'A' }).success).toBe(false);
      expect(leadSchema.safeParse({ ...validBasePayload, name: 'A'.repeat(101) }).success).toBe(false);
      expect(leadSchema.safeParse({ ...validBasePayload, name: 'Valid Name' }).success).toBe(true);
    });

    it('rejects empty company name or company name longer than 100 characters', () => {
      expect(leadSchema.safeParse({ ...validBasePayload, company: '' }).success).toBe(false);
      expect(leadSchema.safeParse({ ...validBasePayload, company: 'C'.repeat(101) }).success).toBe(false);
    });

    it('rejects invalid email formats or email exceeding 255 characters', () => {
      expect(leadSchema.safeParse({ ...validBasePayload, email: 'notanemail' }).success).toBe(false);
      expect(leadSchema.safeParse({ ...validBasePayload, email: `${'a'.repeat(250)}@test.com` }).success).toBe(false);
    });

    it('validates phone number characters and max length 30', () => {
      expect(leadSchema.safeParse({ ...validBasePayload, phone: '+1 (555) 019-2831' }).success).toBe(true);
      expect(leadSchema.safeParse({ ...validBasePayload, phone: '555-1234' }).success).toBe(true);
      expect(leadSchema.safeParse({ ...validBasePayload, phone: '' }).success).toBe(true);
      expect(leadSchema.safeParse({ ...validBasePayload, phone: '1'.repeat(31) }).success).toBe(false);
      expect(leadSchema.safeParse({ ...validBasePayload, phone: 'phone-with-bad-chars!@#$' }).success).toBe(false);
    });

    it('rejects notes exceeding 2000 characters', () => {
      expect(leadSchema.safeParse({ ...validBasePayload, notes: 'N'.repeat(2001) }).success).toBe(false);
      expect(leadSchema.safeParse({ ...validBasePayload, notes: 'N'.repeat(2000) }).success).toBe(true);
    });
  });
});
