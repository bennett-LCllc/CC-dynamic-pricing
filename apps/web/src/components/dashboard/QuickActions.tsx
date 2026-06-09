'use client';

import { Plus, Building2, Sparkles, TreePine, CalendarDays } from 'lucide-react';
import Link from 'next/link';

const actions = [
  {
    label: 'Add Property',
    description: 'Register a new STR unit',
    icon: Building2,
    href: '/properties' as const,
    color: 'bg-ocean-500 hover:bg-ocean-600',
  },
  {
    label: 'Schedule Cleaning',
    description: 'Book a turnover clean',
    icon: Sparkles,
    href: '/cleaning' as const,
    color: 'bg-purple-500 hover:bg-purple-600',
  },
  {
    label: 'Schedule Lawn',
    description: 'Book lawn maintenance',
    icon: TreePine,
    href: '/lawn' as const,
    color: 'bg-palm-500 hover:bg-palm-600',
  },
  {
    label: 'Add Booking',
    description: 'Manual booking entry',
    icon: CalendarDays,
    href: '/bookings' as const,
    color: 'bg-sand-500 hover:bg-sand-600',
  },
];

export function QuickActions() {
  return (
    <div className="card p-5">
      <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
      <div className="grid grid-cols-2 gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.label}
              href={action.href}
              className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted transition-colors group"
            >
              <div className={`p-2 rounded-lg ${action.color} transition-colors`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-sm font-medium group-hover:text-ocean-600 transition-colors">
                  {action.label}
                </p>
                <p className="text-xs text-muted-foreground">{action.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
