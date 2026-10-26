import { z } from 'zod';

export const leadStatusSchema = z.enum(['new', 'qualified', 'proposal', 'won', 'lost']);

export const leadSchema = z.object({
  name: z.string().trim().min(2, { message: 'Lead name must be at least 2 characters' }).max(100),
  company: z.string().trim().min(1, { message: 'Company name is required' }).max(100),
  email: z.string().trim().email({ message: 'A valid email address is required' }),
  phone: z.string().trim().optional().or(z.literal('')),
  service: z.string().trim().min(2, { message: 'Requested service is required' }),
  source: z.string().trim().min(2, { message: 'Lead source is required' }),
  status: leadStatusSchema.default('new'),
  deal_value: z.coerce.number().min(0, { message: 'Deal value must be 0 or greater' }).default(0),
  next_follow_up: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});

export type LeadFormData = z.infer<typeof leadSchema>;

export const leadFilterSchema = z.object({
  search: z.string().optional(),
  status: z.union([leadStatusSchema, z.literal('all')]).optional(),
  service: z.string().optional(),
});

export type LeadFilters = z.infer<typeof leadFilterSchema>;
