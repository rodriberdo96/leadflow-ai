'use client';

import * as React from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { LeadTable } from '@/components/leads/lead-table';
import { LeadFiltersBar } from '@/components/leads/lead-filters';
import { LeadFormDialog } from '@/components/leads/lead-form-dialog';
import { useLeads } from '@/features/leads/leads-context';

export default function LeadsPage() {
  const { leads } = useLeads();
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [serviceFilter, setServiceFilter] = React.useState('all');
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);

  // Filter leads based on search, status, and service
  const filteredLeads = React.useMemo(() => {
    return leads.filter((lead) => {
      // Search filter
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesName = lead.name.toLowerCase().includes(query);
        const matchesCompany = lead.company.toLowerCase().includes(query);
        const matchesEmail = lead.email.toLowerCase().includes(query);
        const matchesService = lead.service.toLowerCase().includes(query);
        const matchesNotes = lead.notes ? lead.notes.toLowerCase().includes(query) : false;

        if (!matchesName && !matchesCompany && !matchesEmail && !matchesService && !matchesNotes) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== 'all' && lead.status !== statusFilter) {
        return false;
      }

      // Service filter
      if (serviceFilter !== 'all' && lead.service !== serviceFilter) {
        return false;
      }

      return true;
    });
  }, [leads, search, statusFilter, serviceFilter]);

  const handleResetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setServiceFilter('all');
  };

  return (
    <DashboardShell
      title="Leads Management"
      description="View, search, filter, and track all incoming client inquiries and opportunities"
    >
      <div className="space-y-4">
        {/* Search & Filter Bar */}
        <LeadFiltersBar
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          serviceFilter={serviceFilter}
          onServiceChange={setServiceFilter}
          onReset={handleResetFilters}
          totalFiltered={filteredLeads.length}
        />

        {/* Leads Table */}
        <LeadTable
          leads={filteredLeads}
          onOpenCreate={() => setIsCreateOpen(true)}
        />
      </div>

      {/* Create Lead Modal */}
      <LeadFormDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />
    </DashboardShell>
  );
}
