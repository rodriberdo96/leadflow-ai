'use client';

import * as React from 'react';
import Link from 'next/link';
import { CheckCircle2, Circle, Clock, ChevronRight, Calendar } from 'lucide-react';
import { useLeads } from '@/features/leads/leads-context';
import { formatDate } from '@/lib/utils';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export function FollowUpTaskList() {
  const { tasks, toggleTask } = useLeads();

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <div>
          <CardTitle className="text-base font-semibold">Follow-up Tasks</CardTitle>
          <p className="text-xs text-slate-500 mt-0.5">
            Upcoming agency outreach & action items
          </p>
        </div>
        <Link
          href="/tasks"
          className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors"
        >
          <span>All Tasks</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </CardHeader>

      <CardContent className="p-0">
        {tasks.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-slate-500">No pending follow-ups!</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {tasks.slice(0, 5).map((task) => (
              <div
                key={task.id}
                className="flex items-start gap-3 p-4 hover:bg-slate-50/70 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => toggleTask(task.id)}
                  className="mt-0.5 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                  aria-label={task.completed ? 'Mark task incomplete' : 'Mark task complete'}
                >
                  {task.completed ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Circle className="h-4 w-4 text-slate-300 hover:text-indigo-500" />
                  )}
                </button>

                <div className="min-w-0 flex-1">
                  <p
                    className={`text-xs font-medium ${
                      task.completed
                        ? 'line-through text-slate-400'
                        : 'text-slate-800'
                    }`}
                  >
                    {task.title}
                  </p>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
                    {task.lead_name && (
                      <span className="font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded">
                        {task.lead_name}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-slate-400" />
                      {formatDate(task.due_date)}
                    </span>
                  </div>
                </div>

                <div>
                  {task.completed ? (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                      Done
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
                      <Clock className="h-2.5 w-2.5" />
                      Action Due
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
