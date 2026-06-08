'use client';

import { CalendarDays, Sparkles, CalendarPlus } from 'lucide-react';
import type { DashboardData } from '@/lib/api';

interface RecentActivityProps {
  data: DashboardData;
}

export function RecentActivity({ data }: RecentActivityProps) {
  const allActivity = [
    ...data.recentActivity.bookings.map((b) => ({
      ...b,
      icon: CalendarPlus,
      iconColor: 'text-ocean-500',
    })),
    ...data.recentActivity.cleaningJobs.map((j) => ({
      ...j,
      icon: Sparkles,
      iconColor: 'text-purple-500',
    })),
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (allActivity.length === 0) {
    return (
      <div className="card p-5">
        <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
        <div className="text-center py-8">
          <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
            <CalendarDays className="w-6 h-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">
            No activity yet. Add your first property to get started.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
      <div className="space-y-3">
        {allActivity.slice(0, 8).map((item) => {
          const Icon = item.icon;
          return (
            <div key={`${item.type}-${item.id}`} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
              <div className={`p-1.5 rounded-lg bg-muted ${item.iconColor} shrink-0 mt-0.5`}>
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground">{item.property}</span>
                  <span className="text-xs text-muted-foreground">·</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(item.date).toLocaleDateString()}
                  </span>
                  {'amount' in item && typeof item.amount === 'number' && item.amount > 0 && (
                    <>
                      <span className="text-xs text-muted-foreground">·</span>
                      <span className="text-xs font-medium text-palm-600">
                        ${item.amount.toLocaleString()}
                      </span>
                    </>
                  )}
                </div>
              </div>
              <span className={`badge shrink-0 ${
                item.status === 'CONFIRMED' || item.status === 'COMPLETED' ? 'badge-success' :
                item.status === 'ACTIVE' || item.status === 'ASSIGNED' ? 'badge-info' :
                item.status === 'CANCELLED' ? 'badge-danger' :
                'badge-warning'
              }`}>
                {item.status}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
