'use client';

import { Building2, TreePine, Sparkles } from 'lucide-react';
import type { DashboardData } from '@/lib/api';

interface LLCSummaryProps {
  data: DashboardData;
}

export function LLCSummary({ data }: LLCSummaryProps) {
  const llcs = [
    {
      name: 'STR LLC',
      icon: Building2,
      color: 'text-ocean-500',
      bgColor: 'bg-ocean-50',
      stats: [
        { label: 'Units', value: data.llcs.str.units },
        { label: 'Revenue MTD', value: `$${data.llcs.str.mtdRevenue.toLocaleString()}` },
        { label: 'Occupancy', value: data.llcs.str.occupancy },
      ],
    },
    {
      name: 'Lawn LLC',
      icon: TreePine,
      color: 'text-palm-500',
      bgColor: 'bg-palm-50',
      stats: [
        { label: 'Clients', value: data.llcs.lawn.clients },
        { label: 'Jobs Today', value: String(data.llcs.lawn.jobsToday) },
        { label: 'MTD Costs', value: `$${data.expenses.lawn.toLocaleString()}` },
      ],
    },
    {
      name: 'Cleaning LLC',
      icon: Sparkles,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50',
      stats: [
        { label: 'Clients', value: data.llcs.cleaning.clients },
        { label: 'Turnovers Today', value: String(data.llcs.cleaning.turnoversToday) },
        { label: 'MTD Costs', value: `$${data.expenses.cleaning.toLocaleString()}` },
      ],
    },
  ];

  return (
    <div className="card p-5">
      <h3 className="text-lg font-semibold mb-4">LLC Overview</h3>
      <div className="space-y-4">
        {llcs.map((llc) => {
          const Icon = llc.icon;
          return (
            <div key={llc.name} className={`p-4 rounded-lg ${llc.bgColor}`}>
              <div className="flex items-center gap-3 mb-3">
                <Icon className={`w-5 h-5 ${llc.color}`} />
                <h4 className="font-semibold text-sm">{llc.name}</h4>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {llc.stats.map((stat) => (
                  <div key={stat.label}>
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="text-sm font-semibold">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
