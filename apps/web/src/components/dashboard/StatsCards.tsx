'use client';

import { Building2, DollarSign, CalendarDays, TrendingUp } from 'lucide-react';
import type { DashboardData } from '@/lib/api';

interface StatsCardsProps {
  data: DashboardData;
}

export function StatsCards({ data }: StatsCardsProps) {
  const stats = [
    {
      label: 'Properties',
      value: String(data.properties.active),
      subLabel: `${data.properties.total} total`,
      change: data.properties.active > 0 ? `${data.properties.occupancyRate}% occupancy` : 'Add your first property',
      changeType: data.properties.active > 0 ? 'positive' as const : 'neutral' as const,
      icon: Building2,
      iconColor: 'text-ocean-500',
    },
    {
      label: 'MTD Revenue',
      value: `$${data.revenue.mtd.toLocaleString()}`,
      subLabel: `Projected: $${Math.round(data.revenue.projectedMonthly).toLocaleString()}`,
      change: data.revenue.mtd > 0 ? 'This month' : 'No revenue yet',
      changeType: data.revenue.mtd > 0 ? 'positive' as const : 'neutral' as const,
      icon: DollarSign,
      iconColor: 'text-palm-500',
    },
    {
      label: 'Occupancy Rate',
      value: data.properties.active > 0 ? `${data.properties.occupancyRate}%` : '—',
      subLabel: 'This month',
      change: data.properties.occupancyRate > 50 ? 'Strong' : data.properties.occupancyRate > 0 ? 'Building up' : 'No data yet',
      changeType: data.properties.occupancyRate > 50 ? 'positive' as const : 'neutral' as const,
      icon: TrendingUp,
      iconColor: 'text-sand-500',
    },
    {
      label: 'Upcoming Bookings',
      value: String(data.upcomingBookings),
      subLabel: `${data.today.checkIns} check-ins today`,
      change: data.today.checkOuts > 0 ? `${data.today.checkOuts} check-outs today` : 'No check-outs today',
      changeType: 'neutral' as const,
      icon: CalendarDays,
      iconColor: 'text-purple-500',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.label} className="stat-card">
            <div className="flex items-center justify-between">
              <div className={`p-2 rounded-lg bg-muted ${stat.iconColor}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <p className="stat-label">{stat.label}</p>
              <p className="stat-value">{stat.value}</p>
              <p className={`stat-change ${
                stat.changeType === 'positive' ? 'text-palm-500' :
                'text-muted-foreground'
              }`}>
                {stat.change}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
