'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Building2,
  CalendarDays,
  Sparkles,
  TreePine,
  DollarSign,
  BarChart3,
  Settings,
  MessageSquare,
} from 'lucide-react';
import clsx from 'clsx';

const navItems = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/properties', label: 'Properties', icon: Building2 },
  { href: '/bookings', label: 'Bookings', icon: CalendarDays },
  { href: '/pricing', label: 'Pricing', icon: DollarSign },
  { href: '/cleaning', label: 'Cleaning', icon: Sparkles },
  { href: '/lawn', label: 'Lawn Care', icon: TreePine },
  { href: '/financials', label: 'Financials', icon: BarChart3 },
  { href: '/messages', label: 'Messages', icon: MessageSquare },
  { href: '/settings', label: 'Settings', icon: Settings },
];

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
          const isActive = pathname === item.href ||
            (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
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
