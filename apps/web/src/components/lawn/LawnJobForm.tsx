'use client';

import { useEffect, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import {
  getProperties,
  getLawnCrews,
} from '@/lib/api';
import type {
  Property,
  LawnJob,
  CreateLawnJobInput,
  LawnCrew,
} from '@cc-ops/shared';

const SERVICE_TYPES = [
  { value: 'MOW', label: 'Mow' },
  { value: 'EDGE', label: 'Edge' },
  { value: 'TRIM', label: 'Trim' },
  { value: 'FERTILIZE', label: 'Fertilize' },
  { value: 'FULL_SERVICE', label: 'Full Service' },
] as const;

const JOB_STATUSES = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'ISSUE_REPORTED', label: 'Issue Reported' },
] as const;

const LOT_SIZES = [
  { value: 'QUARTER_ACRE', label: 'Quarter Acre' },
  { value: 'THIRD_ACRE', label: 'Third Acre' },
  { value: 'HALF_ACRE', label: 'Half Acre' },
  { value: 'ACRE', label: 'Full Acre' },
  { value: 'PLUS', label: '1+ Acres' },
] as const;

interface LawnJobFormProps {
  job?: LawnJob | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function LawnJobForm({ job, onClose, onSaved }: LawnJobFormProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [crews, setCrews] = useState<LawnCrew[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState<CreateLawnJobInput>({
    propertyId: '',
    crewId: undefined,
    scheduledDate: '',
    scheduledTime: undefined,
    serviceType: 'MOW',
    status: 'PENDING',
    lotSize: undefined,
    customerCharge: undefined,
    laborCost: undefined,
    materialCost: undefined,
    notes: '',
  });

  useEffect(() => {
    async function load() {
      try {
        const [props, crws] = await Promise.all([
          getProperties(),
          getLawnCrews(),
        ]);
        setProperties(props as unknown as Property[]);
        setCrews(crws);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load form data');
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (job) {
      setForm({
        propertyId: job.propertyId,
        crewId: job.crewId ?? undefined,
        scheduledDate: job.scheduledDate,
        scheduledTime: job.scheduledTime ?? undefined,
        serviceType: job.serviceType,
        status: job.status,
        lotSize: job.lotSize ?? undefined,
        customerCharge: job.customerCharge != null ? Number(job.customerCharge) : undefined,
        laborCost: job.laborCost != null ? Number(job.laborCost) : undefined,
        materialCost: job.materialCost != null ? Number(job.materialCost) : undefined,
        notes: job.notes ?? '',
      });
    }
  }, [job]);

  const handleChange = (field: string, value: string | number | undefined) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { createLawnJob, updateLawnJob } = await import('@/lib/api');
      if (job) {
        await updateLawnJob(job.id, form);
      } else {
        await createLawnJob(form);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save lawn job');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-lg font-semibold">
            {job ? 'Edit Lawn Job' : 'New Lawn Job'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Property & Crew */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Property *</label>
              <select
                value={form.propertyId}
                onChange={(e) => handleChange('propertyId', e.target.value)}
                required
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-palm-500 focus:border-transparent"
              >
                <option value="">Select property...</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Crew</label>
              <select
                value={form.crewId ?? ''}
                onChange={(e) => handleChange('crewId', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-palm-500 focus:border-transparent"
              >
                <option value="">Unassigned</option>
                {crews.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Schedule */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Scheduled Date *</label>
              <input
                type="date"
                value={form.scheduledDate ? form.scheduledDate.slice(0, 10) : ''}
                onChange={(e) => handleChange('scheduledDate', e.target.value)}
                required
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-palm-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Scheduled Time</label>
              <input
                type="time"
                value={form.scheduledTime ?? ''}
                onChange={(e) => handleChange('scheduledTime', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-palm-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Type, Status, Lot Size */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Service Type *</label>
              <select
                value={form.serviceType}
                onChange={(e) => handleChange('serviceType', e.target.value)}
                required
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-palm-500 focus:border-transparent"
              >
                {SERVICE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Status</label>
              <select
                value={form.status}
                onChange={(e) => handleChange('status', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-palm-500 focus:border-transparent"
              >
                {JOB_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Lot Size</label>
              <select
                value={form.lotSize ?? ''}
                onChange={(e) => handleChange('lotSize', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-palm-500 focus:border-transparent"
              >
                <option value="">Select size...</option>
                {LOT_SIZES.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Financials */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Customer Charge</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.customerCharge ?? ''}
                  onChange={(e) => handleChange('customerCharge', e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full pl-7 pr-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-palm-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Labor Cost</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.laborCost ?? ''}
                  onChange={(e) => handleChange('laborCost', e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full pl-7 pr-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-palm-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Material Cost</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.materialCost ?? ''}
                  onChange={(e) => handleChange('materialCost', e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full pl-7 pr-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-palm-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea
              value={form.notes ?? ''}
              onChange={(e) => handleChange('notes', e.target.value)}
              rows={3}
              maxLength={1000}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-palm-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-palm-600 text-white rounded-lg hover:bg-palm-700 transition-colors disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {job ? 'Save Changes' : 'Create Job'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
