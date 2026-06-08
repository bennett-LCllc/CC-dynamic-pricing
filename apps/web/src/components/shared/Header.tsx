'use client';

import { Bell, Search, User } from 'lucide-react';

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="bg-white border-b border-border px-8 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search properties, bookings..."
              className="pl-10 pr-4 py-2 text-sm bg-muted rounded-lg border-0 focus:ring-2 focus:ring-ring w-64"
            />
          </div>

          {/* Notifications */}
          <button className="relative p-2 rounded-lg hover:bg-muted transition-colors">
            <Bell className="w-5 h-5 text-muted-foreground" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-destructive rounded-full" />
          </button>

          {/* User */}
          <button className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors">
            <div className="w-8 h-8 bg-ocean-500 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}
