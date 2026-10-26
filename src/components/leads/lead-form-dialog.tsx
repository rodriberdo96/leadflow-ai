'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { leadSchema, type LeadFormData } from '@/lib/validation/lead';
import type { Lead, LeadService, LeadSource, LeadStatus } from '@/types/lead';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLeads } from '@/features/leads/leads-context';

interface LeadFormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  leadToEdit?: Lead | null;
}

const SERVICE_OPTIONS: LeadService[] = [
  'Web Development',
  'UI/UX Design',
  'SEO Optimization',
  'Paid Advertising',
  'Branding & Identity',
  'Custom Software',
];

const SOURCE_OPTIONS: LeadSource[] = [
  'Website Form',
  'Referral',
  'LinkedIn',
  'Cold Outreach',
  'Google Search',
  'Event',
];

const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: 'new', label: 'New Lead' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'proposal', label: 'Proposal Sent' },
  { value: 'won', label: 'Closed Won' },
  { value: 'lost', label: 'Closed Lost' },
];

export function LeadFormDialog({
  isOpen,
  onClose,
  leadToEdit,
}: LeadFormDialogProps) {
  const { createLead, updateLead } = useLeads();
  const isEditing = Boolean(leadToEdit);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      name: '',
      company: '',
      email: '',
      phone: '',
      service: 'Web Development',
      source: 'Website Form',
      status: 'new',
      deal_value: 0,
      next_follow_up: '',
      notes: '',
    },
  });

  React.useEffect(() => {
    if (leadToEdit) {
      // Format next_follow_up for date input (YYYY-MM-DD)
      let formattedFollowUp = '';
      if (leadToEdit.next_follow_up) {
        try {
          formattedFollowUp = new Date(leadToEdit.next_follow_up).toISOString().split('T')[0];
        } catch {
          formattedFollowUp = '';
        }
      }

      reset({
        name: leadToEdit.name,
        company: leadToEdit.company,
        email: leadToEdit.email,
        phone: leadToEdit.phone || '',
        service: leadToEdit.service,
        source: leadToEdit.source,
        status: leadToEdit.status,
        deal_value: leadToEdit.deal_value,
        next_follow_up: formattedFollowUp,
        notes: leadToEdit.notes || '',
      });
    } else {
      reset({
        name: '',
        company: '',
        email: '',
        phone: '',
        service: 'Web Development',
        source: 'Website Form',
        status: 'new',
        deal_value: 0,
        next_follow_up: '',
        notes: '',
      });
    }
  }, [leadToEdit, reset, isOpen]);

  const onSubmit = (data: LeadFormData) => {
    if (isEditing && leadToEdit) {
      updateLead(leadToEdit.id, data);
    } else {
      createLead(data);
    }
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Lead' : 'Create New Lead'}
      description={
        isEditing
          ? 'Update the lead details, status, or follow-up schedule.'
          : 'Add a new agency prospect to your pipeline and start tracking interactions.'
      }
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Lead Name */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Contact Name <span className="text-rose-500">*</span>
            </label>
            <Input
              placeholder="e.g. Sarah Jenkins"
              error={errors.name?.message}
              {...register('name')}
            />
          </div>

          {/* Company */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Company Name <span className="text-rose-500">*</span>
            </label>
            <Input
              placeholder="e.g. Apex Digital"
              error={errors.company?.message}
              {...register('company')}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Email Address <span className="text-rose-500">*</span>
            </label>
            <Input
              type="email"
              placeholder="sarah@apex.io"
              error={errors.email?.message}
              {...register('email')}
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Phone Number
            </label>
            <Input
              type="tel"
              placeholder="+1 (555) 000-0000"
              error={errors.phone?.message}
              {...register('phone')}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Requested Service */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Requested Service <span className="text-rose-500">*</span>
            </label>
            <select
              className="flex h-9 w-full rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
              {...register('service')}
            >
              {SERVICE_OPTIONS.map((srv) => (
                <option key={srv} value={srv}>
                  {srv}
                </option>
              ))}
            </select>
            {errors.service && (
              <p className="mt-1 text-xs text-rose-500">{errors.service.message}</p>
            )}
          </div>

          {/* Lead Source */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Lead Source <span className="text-rose-500">*</span>
            </label>
            <select
              className="flex h-9 w-full rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
              {...register('source')}
            >
              {SOURCE_OPTIONS.map((src) => (
                <option key={src} value={src}>
                  {src}
                </option>
              ))}
            </select>
            {errors.source && (
              <p className="mt-1 text-xs text-rose-500">{errors.source.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Pipeline Status */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Pipeline Stage <span className="text-rose-500">*</span>
            </label>
            <select
              className="flex h-9 w-full rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
              {...register('status')}
            >
              {STATUS_OPTIONS.map((st) => (
                <option key={st.value} value={st.value}>
                  {st.label}
                </option>
              ))}
            </select>
            {errors.status && (
              <p className="mt-1 text-xs text-rose-500">{errors.status.message}</p>
            )}
          </div>

          {/* Estimated Deal Value */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Estimated Value ($)
            </label>
            <Input
              type="number"
              min="0"
              step="100"
              placeholder="5000"
              error={errors.deal_value?.message}
              {...register('deal_value')}
            />
          </div>

          {/* Next Follow-up Date */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Next Follow-up
            </label>
            <Input
              type="date"
              error={errors.next_follow_up?.message}
              {...register('next_follow_up')}
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Notes / Opportunity Summary
          </label>
          <textarea
            rows={3}
            className="flex w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 placeholder:text-slate-400"
            placeholder="Add context on project scope, timeline, budget notes, or key client stakeholders..."
            {...register('notes')}
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {isEditing ? 'Save Changes' : 'Create Lead'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
