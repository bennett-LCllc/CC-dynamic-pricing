'use client';

import { CalendarDays, Sparkles, TreePine, AlertCircle } from 'lucide-react';

export function RecentActivity() {
  // Placeholder — will be populated from the database
  const hasActivity = false;

  if (!hasActivity) {
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
        {/* Activity items will render here */}
      </div>
    </div>
  );
}
