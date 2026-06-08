'use client';

import { AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import type { DashboardData } from '@/lib/api';

interface AlertsPanelProps {
  data: DashboardData;
}

export function AlertsPanel({ data }: AlertsPanelProps) {
  const { alerts } = data;

  if (alerts.length === 0) {
    return (
      <div className="card p-5">
        <h3 className="text-lg font-semibold mb-4">Alerts</h3>
        <div className="flex items-center gap-3 p-3 bg-palm-50 rounded-lg">
          <CheckCircle className="w-5 h-5 text-palm-500 shrink-0" />
          <p className="text-sm text-palm-700">
            All systems nominal. Add properties and bookings to start receiving alerts.
          </p>
        </div>
      </div>
    );
  }

  const iconMap = {
    critical: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  };
  const colorMap = {
    critical: 'text-red-500',
    warning: 'text-sand-500',
    info: 'text-ocean-500',
  };
  const bgMap = {
    critical: 'bg-red-50',
    warning: 'bg-sand-50',
    info: 'bg-ocean-50',
  };

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Alerts</h3>
        <span className="badge badge-warning">{alerts.length}</span>
      </div>
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {alerts.map((alert) => {
          const Icon = iconMap[alert.type];
          return (
            <div
              key={alert.id}
              className={`flex items-start gap-3 p-3 rounded-lg ${bgMap[alert.type]}`}
            >
              <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${colorMap[alert.type]}`} />
              <div>
                <p className="text-sm font-medium">{alert.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
