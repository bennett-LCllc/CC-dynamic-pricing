'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Building2,
  CalendarDays,
  CalendarRange,
  Sparkles,
  TreePine,
  DollarSign,
  BarChart3,
  Settings,
  MessageSquare,
} from 'lucide-react';
import clsx from 'clsx';

const navItems = [
  { href: '/' as const, label: 'Dashboard', icon: Home, basePath: '/' },
  { href: '/properties' as const, label: 'Properties', icon: Building2, basePath: '/properties' },
  { href: '/bookings' as const, label: 'Bookings', icon: CalendarDays, basePath: '/bookings' },
  { href: '/bookings/calendar' as const, label: 'Calendar', icon: CalendarRange, basePath: '/bookings/calendar' },
  { href: '/pricing' as const, label: 'Pricing', icon: DollarSign, basePath: '/pricing' },
  { href: '/cleaning' as const, label: 'Cleaning', icon: Sparkles, basePath: '/cleaning' },
  { href: '/lawn' as const, label: 'Lawn Care', icon: TreePine, basePath: '/lawn' },
  { href: '/financials' as const, label: 'Financials', icon: BarChart3, basePath: '/financials' },
  { href: '/messages' as const, label: 'Messages', icon: MessageSquare, basePath: '/messages' },
  { href: '/settings' as const, label: 'Settings', icon: Settings, basePath: '/settings' },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-ocean-950 text-white flex flex-col min-h-screen">
      {/* Logo */}
      <div className="p-6 border-b border-ocean-800">
        <h1 className="text-xl font-bold tracking-tight">
          <span className="text-ocean-400">CC</span> Ops
        </h1>
        <p className="text-xs text-ocean-400 mt-1">Corpus Christi STR Portfolio</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.basePath !== '/' &&
              pathname.startsWith(item.basePath) &&
              // Prevent /bookings from matching /bookings/calendar
              pathname.length <= item.basePath.length + 1);
          const isActiveExact = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              href={item.href as any}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-ocean-800 text-white'
                  : 'text-ocean-300 hover:bg-ocean-900 hover:text-white'
              )}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-ocean-800">
        <div className="text-xs text-ocean-500">
          <p>v0.1.0 — Pre-launch</p>
          <p className="mt-1">3 LLCs • Corpus Christi, TX</p>
        </div>
      </div>
    </aside>
  );
}
