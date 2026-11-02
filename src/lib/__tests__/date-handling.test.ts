import { describe, it, expect } from 'vitest';
import { formatDate, toInputDateString, parseDateSafe } from '../utils';

describe('Date Handling & Timezone-Safe Formatting (Phase 4)', () => {
  describe('toInputDateString', () => {
    it('normalizes YYYY-MM-DD input cleanly', () => {
      expect(toInputDateString('2026-10-27')).toBe('2026-10-27');
    });

    it('extracts calendar date from full ISO timestamps without offset shift', () => {
      expect(toInputDateString('2026-10-27T14:30:00Z')).toBe('2026-10-27');
      expect(toInputDateString('2026-10-27T00:00:00.000Z')).toBe('2026-10-27');
    });

    it('handles empty and invalid values gracefully', () => {
      expect(toInputDateString('')).toBe('');
      expect(toInputDateString(null)).toBe('');
      expect(toInputDateString(undefined)).toBe('');
      expect(toInputDateString('not-a-valid-date')).toBe('');
    });
  });

  describe('formatDate', () => {
    it('formats a date-only string preserving the intended calendar day', () => {
      // Regardless of local time zone, 2026-10-27 must display Oct 27, 2026 (never Oct 26)
      const formatted = formatDate('2026-10-27');
      expect(formatted).toBe('Oct 27, 2026');
    });

    it('formats an ISO timestamp accurately', () => {
      const formatted = formatDate('2026-12-25T12:00:00Z');
      expect(formatted).toBe('Dec 25, 2026');
    });

    it('returns N/A for empty strings or nullish input', () => {
      expect(formatDate('')).toBe('N/A');
      expect(formatDate(null)).toBe('N/A');
      expect(formatDate(undefined)).toBe('N/A');
    });
  });

  describe('parseDateSafe', () => {
    it('parses calendar date components without UTC midnight offset shifts', () => {
      const parsed = parseDateSafe('2026-10-27');
      expect(parsed).not.toBeNull();
      if (parsed) {
        expect(parsed.getFullYear()).toBe(2026);
        expect(parsed.getMonth()).toBe(9); // 0-indexed: October is 9
        expect(parsed.getDate()).toBe(27);
      }
    });

    it('returns null for non-date strings', () => {
      expect(parseDateSafe('not-a-date')).toBeNull();
      expect(parseDateSafe('')).toBeNull();
    });
  });
});
