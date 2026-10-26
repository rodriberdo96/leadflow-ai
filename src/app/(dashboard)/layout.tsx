'use client';

import * as React from 'react';
import { LeadsProvider } from '@/features/leads/leads-context';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LeadsProvider>{children}</LeadsProvider>;
}
