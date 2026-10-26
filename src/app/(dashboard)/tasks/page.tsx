'use client';

import * as React from 'react';
import { DashboardShell } from '@/components/layout/dashboard-shell';
import { useLeads } from '@/features/leads/leads-context';
import { formatDate } from '@/lib/utils';
import { CheckCircle2, Circle, Calendar } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function TasksPage() {
  const { tasks, toggleTask } = useLeads();

  const pendingTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  return (
    <DashboardShell
      title="Follow-ups & Tasks"
      description="Track and manage critical follow-up touchpoints and client deliverables"
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Pending Follow-ups
            </span>
            <div className="text-2xl font-bold text-slate-900 mt-1">
              {pendingTasks.length}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-2xs">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
              Completed Actions
            </span>
            <div className="text-2xl font-bold text-emerald-600 mt-1">
              {completedTasks.length}
            </div>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Active Tasks</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {pendingTasks.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-500">
                All follow-ups are up to date!
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {pendingTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-4 hover:bg-slate-50/70 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => toggleTask(task.id)}
                        className="mt-0.5 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                        aria-label="Mark completed"
                      >
                        <Circle className="h-5 w-5 text-slate-300 hover:text-indigo-600" />
                      </button>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {task.title}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                          {task.lead_name && (
                            <span className="font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                              {task.lead_name}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            {formatDate(task.due_date)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {completedTasks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold text-slate-600">
                Completed Tasks
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-slate-100 opacity-80">
                {completedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-4 hover:bg-slate-50/70 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <button
                        type="button"
                        onClick={() => toggleTask(task.id)}
                        className="mt-0.5 text-emerald-600 cursor-pointer"
                        aria-label="Mark pending"
                      >
                        <CheckCircle2 className="h-5 w-5" />
                      </button>
                      <div>
                        <p className="text-sm font-medium line-through text-slate-400">
                          {task.title}
                        </p>
                        {task.lead_name && (
                          <span className="text-xs text-slate-400 mt-1 inline-block">
                            {task.lead_name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardShell>
  );
}
