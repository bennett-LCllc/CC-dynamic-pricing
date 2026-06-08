'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/shared/Header';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { QuickActions } from '@/components/dashboard/QuickActions';
import { RecentActivity } from '@/components/dashboard/RecentActivity';
import { AlertsPanel } from '@/components/dashboard/AlertsPanel';
import { LLCSummary } from '@/components/dashboard/LLCSummary';
import { getDashboardOverview } from '@/lib/api';
import type { DashboardData } from '@/lib/api';
import { Loader2, AlertTriangle } from 'lucide-react';

function DashboardSkeleton() {
  return (
    <div className="p-8 space-y-6">
      {/* Stats skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="stat-card animate-pulse">
            <div className="h-9 w-9 bg-muted rounded-lg" />
            <div className="mt-3 h-4 bg-muted rounded w-20" />
            <div className="mt-1 h-7 bg-muted rounded w-16" />
            <div className="mt-1 h-3 bg-muted rounded w-24" />
          </div>
        ))}
      </div>
      {/* Grid skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-5 animate-pulse">
            <div className="h-5 bg-muted rounded w-28 mb-4" />
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 bg-muted rounded-lg" />
              ))}
            </div>
          </div>
          <div className="card p-5 animate-pulse">
            <div className="h-5 bg-muted rounded w-32 mb-4" />
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-muted rounded-lg" />
              ))}
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="card p-5 animate-pulse">
            <div className="h-5 bg-muted rounded w-24 mb-4" />
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-muted rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const dashboardData = await getDashboardOverview();
        setData(dashboardData);
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  return (
    <div>
      <Header
        title="Dashboard"
        subtitle="Corpus Christi STR Portfolio — All three LLCs at a glance"
      />

      <div className="p-8 space-y-6">
        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && <DashboardSkeleton />}

        {/* Data */}
        {data && !loading && (
          <>
            {/* Hide banner if we have data */}
            {data.properties.active === 0 && (
              <div className="card p-4 bg-ocean-50 border-ocean-200">
                <p className="text-sm text-ocean-700">
                  👋 Welcome! Add your first property to start seeing live dashboard data.
                </p>
              </div>
            )}

            <StatsCards data={data} />

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <QuickActions />
                <RecentActivity data={data} />
              </div>
              <div className="space-y-6">
                <LLCSummary data={data} />
                <AlertsPanel data={data} />
              </div>
            </div>

            {/* Today's snapshot bar */}
            {(data.today.checkIns > 0 || data.today.checkOuts > 0) && (
              <div className="card p-4">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Today</h4>
                <div className="flex flex-wrap gap-4">
                  {data.today.checkIns > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="badge badge-info">{data.today.checkIns} Check-in{data.today.checkIns > 1 ? 's' : ''}</span>
                    </div>
                  )}
                  {data.today.checkOuts > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="badge badge-warning">{data.today.checkOuts} Check-out{data.today.checkOuts > 1 ? 's' : ''}</span>
                    </div>
                  )}
                  {data.today.cleaningScheduled > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="badge badge-info">{data.today.cleaningScheduled} Cleaning{data.today.cleaningScheduled > 1 ? 's' : ''} Scheduled</span>
                    </div>
                  )}
                  {data.today.cleaningCompleted > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="badge badge-success">{data.today.cleaningCompleted} Cleaning{data.today.cleaningCompleted > 1 ? 's' : ''} Done</span>
                    </div>
                  )}
                  {data.today.lawnScheduled > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="badge badge-info">{data.today.lawnScheduled} Lawn Job{data.today.lawnScheduled > 1 ? 's' : ''}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
