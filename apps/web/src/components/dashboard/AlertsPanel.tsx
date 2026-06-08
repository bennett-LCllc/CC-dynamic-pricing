'use client';

import { AlertCircle, CheckCircle } from 'lucide-react';

export function AlertsPanel() {
  const alerts: Array<{
    id: string;
    type: 'info' | 'warning' | 'critical';
    title: string;
    description: string;
  }> = [];

  if (alerts.length === 0) {
    return (
      <div className="card p-5">
        <h3 className="text-lg font-semibold mb-4">Alerts</h3>
        <div className="flex items-center gap-3 p-3 bg-palm-50 rounded-lg">
          <CheckCircle className="w-5 h-5 text-palm-500 shrink-0" />
          <p className="text-sm text-palm-700">
            All systems nominal. Set up properties and bookings to start receiving alerts.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <h3 className="text-lg font-semibold mb-4">Alerts</h3>
      <div className="space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`flex items-start gap-3 p-3 rounded-lg ${
              alert.type === 'warning' ? 'bg-sand-50' :
              alert.type === 'critical' ? 'bg-red-50' : 'bg-ocean-50'
            }`}
          >
            <AlertCircle className={`w-5 h-5 shrink-0 mt-0.5 ${
              alert.type === 'warning' ? 'text-sand-500' :
              alert.type === 'critical' ? 'text-red-500' : 'text-ocean-500'
            }`} />
            <div>
              <p className="text-sm font-medium">{alert.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{alert.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
