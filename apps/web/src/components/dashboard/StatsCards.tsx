'use client';

import { Building2, DollarSign, CalendarDays, TrendingUp } from 'lucide-react';

interface StatCard {
  label: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
}

const stats: StatCard[] = [
  {
    label: 'Properties',
    value: '0',
    change: 'Ready to add Unit 1',
    changeType: 'neutral',
    icon: Building2,
    iconColor: 'text-ocean-500',
  },
  {
    label: 'MTD Revenue',
    value: '$0',
    change: '—',
    changeType: 'neutral',
    icon: DollarSign,
    iconColor: 'text-palm-500',
  },
  {
    label: 'Occupancy Rate',
    value: '—',
    change: 'No data yet',
    changeType: 'neutral',
    icon: TrendingUp,
    iconColor: 'text-sand-500',
  },
  {
    label: 'Upcoming Bookings',
    value: '0',
    change: '—',
    changeType: 'neutral',
    icon: CalendarDays,
    iconColor: 'text-purple-500',
  },
];

export function StatsCards() {
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
              <p className={`
                stat-change
                ${stat.changeType === 'positive' ? 'text-palm-500' : ''}
                ${stat.changeType === 'negative' ? 'text-destructive' : ''}
                ${stat.changeType === 'neutral' ? 'text-muted-foreground' : ''}
              `}>
                {stat.change}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
