import { z } from 'zod';

export const leadStatusSchema = z.enum(['new', 'qualified', 'proposal', 'won', 'lost']);

const phoneRegex = /^[+]?[\d\s().-]{6,30}$/;

/**
 * Validates whether a date string is either empty or a valid, existing calendar date.
 * Rejects invalid days like February 30 or April 31, and rejects non-standard formats.
 */
export function isValidDateString(val?: string | null): boolean {
  if (!val || val.trim() === '') return true;
  const trimmed = val.trim();

  // Match YYYY-MM-DD
  const dateOnlyMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1]);
    const month = Number(dateOnlyMatch[2]);
    const day = Number(dateOnlyMatch[3]);
    if (month < 1 || month > 12) return false;
    if (day < 1 || day > 31) return false;
    const testDate = new Date(year, month - 1, day);
    return (
      testDate.getFullYear() === year &&
      testDate.getMonth() === month - 1 &&
      testDate.getDate() === day
    );
  }

  // ISO timestamp format verification (must strictly match ISO format YYYY-MM-DDTHH:mm...)
  const isoMatch = trimmed.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d+)?(?:Z|[+-]\d{2}:?\d{2})?$/
  );
  if (isoMatch) {
    const parsed = new Date(trimmed);
    return !Number.isNaN(parsed.getTime());
  }

  return false;
}

export const leadSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: 'Lead name must be at least 2 characters' })
    .max(100, { message: 'Lead name cannot exceed 100 characters' }),
  company: z
    .string()
    .trim()
    .min(1, { message: 'Company name is required' })
    .max(100, { message: 'Company name cannot exceed 100 characters' }),
  email: z
    .string()
    .trim()
    .max(255, { message: 'Email address cannot exceed 255 characters' })
    .email({ message: 'A valid email address is required' }),
  phone: z
    .string()
    .trim()
    .max(30, { message: 'Phone number cannot exceed 30 characters' })
    .refine((val) => val === '' || phoneRegex.test(val), {
      message: 'Please enter a valid phone number',
    })
    .optional()
    .or(z.literal('')),
  service: z
    .string()
    .trim()
    .min(2, { message: 'Requested service is required' })
    .max(100, { message: 'Service name cannot exceed 100 characters' }),
  source: z
    .string()
    .trim()
    .min(2, { message: 'Lead source is required' })
    .max(100, { message: 'Lead source cannot exceed 100 characters' }),
  status: leadStatusSchema.default('new'),
  deal_value: z.preprocess(
    (val) => {
      if (val === '' || val === null || val === undefined) return 0;
      const num = Number(val);
      return num;
    },
    z
      .number()
      .finite({ message: 'Deal value must be a finite number' })
      .min(0, { message: 'Deal value must be 0 or greater' })
      .max(999999999.99, { message: 'Deal value cannot exceed $999,999,999.99' })
  ).default(0),
  next_follow_up: z
    .string()
    .trim()
    .refine(isValidDateString, {
      message: 'Next follow-up must be a valid calendar date (YYYY-MM-DD)',
    })
    .optional()
    .or(z.literal('')),
  notes: z
    .string()
    .max(2000, { message: 'Notes cannot exceed 2,000 characters' })
    .optional()
    .or(z.literal('')),
});

export type LeadFormData = z.infer<typeof leadSchema>;

export const leadFilterSchema = z.object({
  search: z.string().max(100).optional(),
  status: z.union([leadStatusSchema, z.literal('all')]).optional(),
  service: z.string().max(100).optional(),
});

export type LeadFilters = z.infer<typeof leadFilterSchema>;
