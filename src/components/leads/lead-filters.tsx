'use client';

import * as React from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import type { LeadService } from '@/types/lead';

interface LeadFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (status: string) => void;
  serviceFilter: string;
  onServiceChange: (service: string) => void;
  onReset: () => void;
  totalFiltered: number;
}

const SERVICE_OPTIONS: LeadService[] = [
  'Web Development',
  'UI/UX Design',
  'SEO Optimization',
  'Paid Advertising',
  'Branding & Identity',
  'Custom Software',
];

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'All Stages' },
  { value: 'new', label: 'New' },
  { value: 'qualified', label: 'Qualified' },
  { value: 'proposal', label: 'Proposal' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
];

export function LeadFiltersBar({
  search,
  onSearchChange,
  statusFilter,
  onStatusChange,
  serviceFilter,
  onServiceChange,
  onReset,
  totalFiltered,
}: LeadFiltersProps) {
  const isFiltered = search !== '' || statusFilter !== 'all' || serviceFilter !== 'all';

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs">
      <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search */}
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search leads, company, email..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            icon={<Search className="h-4 w-4" />}
          />
        </div>

        {/* Status Dropdown */}
        <div className="w-full sm:w-44">
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            className="flex h-9 w-full rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-medium shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 text-slate-700"
          >
            {STATUS_OPTIONS.map((st) => (
              <option key={st.value} value={st.value}>
                {st.label}
              </option>
            ))}
          </select>
        </div>

        {/* Service Dropdown */}
        <div className="w-full sm:w-48">
          <select
            value={serviceFilter}
            onChange={(e) => onServiceChange(e.target.value)}
            className="flex h-9 w-full rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-medium shadow-2xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 text-slate-700"
          >
            <option value="all">All Services</option>
            {SERVICE_OPTIONS.map((srv) => (
              <option key={srv} value={srv}>
                {srv}
              </option>
            ))}
          </select>
        </div>

        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="text-xs text-slate-500 hover:text-slate-800"
          >
            <RotateCcw className="h-3.5 w-3.5 mr-1" />
            Reset
          </Button>
        )}
      </div>

      <div className="text-xs text-slate-500 whitespace-nowrap self-end sm:self-center">
        Showing <span className="font-semibold text-slate-900">{totalFiltered}</span> results
      </div>
    </div>
  );
}
