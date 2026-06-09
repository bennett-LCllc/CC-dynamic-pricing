'use client';

import { useEffect, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import {
  getProperties,
  getCleaners,
  getBookings,
} from '@/lib/api';
import type {
  Property,
  Booking,
  Cleaner,
  CleaningJob,
  CreateCleaningJobInput,
} from '@cc-ops/shared';

const CLEANING_TYPES = [
  { value: 'TURNOVER', label: 'Turnover' },
  { value: 'DEEP_CLEAN', label: 'Deep Clean' },
  { value: 'MOVE_IN_OUT', label: 'Move In/Out' },
  { value: 'MID_STAY', label: 'Mid-Stay' },
  { value: 'POST_CONSTRUCTION', label: 'Post-Construction' },
] as const;

const JOB_STATUSES = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'ASSIGNED', label: 'Assigned' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'ISSUE_REPORTED', label: 'Issue Reported' },
  { value: 'QUALITY_CHECK', label: 'Quality Check' },
] as const;

interface CleaningJobFormProps {
  job?: CleaningJob | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function CleaningJobForm({ job, onClose, onSaved }: CleaningJobFormProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [cleaners, setCleaners] = useState<Cleaner[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState<CreateCleaningJobInput>({
    propertyId: '',
    bookingId: undefined,
    scheduledStart: '',
    scheduledEnd: '',
    cleaningType: 'TURNOVER',
    status: 'PENDING',
    cleanerId: undefined,
    bedrooms: undefined,
    bathrooms: undefined,
    squareFeet: undefined,
    customerCharge: undefined,
    laborCost: undefined,
    supplyCost: undefined,
    travelCost: undefined,
    notes: '',
  });

  useEffect(() => {
    async function load() {
      try {
        const [props, clns, bkgs] = await Promise.all([
          getProperties(),
          getCleaners(),
          getBookings(),
        ]);
        setProperties(props as unknown as Property[]);
        setCleaners(clns);
        setBookings(bkgs);
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
        bookingId: job.bookingId ?? undefined,
        scheduledStart: job.scheduledStart,
        scheduledEnd: job.scheduledEnd,
        cleaningType: job.cleaningType,
        status: job.status,
        cleanerId: job.cleanerId ?? undefined,
        bedrooms: job.bedrooms ?? undefined,
        bathrooms: job.bathrooms ?? undefined,
        squareFeet: job.squareFeet ?? undefined,
        customerCharge: job.customerCharge != null ? Number(job.customerCharge) : undefined,
        laborCost: job.laborCost != null ? Number(job.laborCost) : undefined,
        supplyCost: job.supplyCost != null ? Number(job.supplyCost) : undefined,
        travelCost: job.travelCost != null ? Number(job.travelCost) : undefined,
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
      const { createCleaningJob, updateCleaningJob } = await import('@/lib/api');
      if (job) {
        await updateCleaningJob(job.id, form);
      } else {
        await createCleaningJob(form);
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save cleaning job');
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
            {job ? 'Edit Cleaning Job' : 'New Cleaning Job'}
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

          {/* Property & Booking */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Property *</label>
              <select
                value={form.propertyId}
                onChange={(e) => handleChange('propertyId', e.target.value)}
                required
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
              >
                <option value="">Select property…</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Linked Booking</label>
              <select
                value={form.bookingId ?? ''}
                onChange={(e) => handleChange('bookingId', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
              >
                <option value="">None</option>
                {bookings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.guestName} — {new Date(b.checkIn).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Schedule */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Scheduled Start *</label>
              <input
                type="datetime-local"
                value={form.scheduledStart ? form.scheduledStart.slice(0, 16) : ''}
                onChange={(e) => handleChange('scheduledStart', e.target.value)}
                required
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Scheduled End *</label>
              <input
                type="datetime-local"
                value={form.scheduledEnd ? form.scheduledEnd.slice(0, 16) : ''}
                onChange={(e) => handleChange('scheduledEnd', e.target.value)}
                required
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
              />
            </div>
          </div>

          {/* Type, Status, Cleaner */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Type *</label>
              <select
                value={form.cleaningType}
                onChange={(e) => handleChange('cleaningType', e.target.value)}
                required
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
              >
                {CLEANING_TYPES.map((t) => (
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
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
              >
                {JOB_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Cleaner</label>
              <select
                value={form.cleanerId ?? ''}
                onChange={(e) => handleChange('cleanerId', e.target.value || undefined)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
              >
                <option value="">Unassigned</option>
                {cleaners.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Property Details */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Bedrooms</label>
              <input
                type="number"
                min={0}
                value={form.bedrooms ?? ''}
                onChange={(e) => handleChange('bedrooms', e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Bathrooms</label>
              <input
                type="number"
                min={0}
                value={form.bathrooms ?? ''}
                onChange={(e) => handleChange('bathrooms', e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Square Feet</label>
              <input
                type="number"
                min={0}
                value={form.squareFeet ?? ''}
                onChange={(e) => handleChange('squareFeet', e.target.value ? Number(e.target.value) : undefined)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
              />
            </div>
          </div>

          {/* Financials */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
                  className="w-full pl-7 pr-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
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
                  className="w-full pl-7 pr-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Supply Cost</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.supplyCost ?? ''}
                  onChange={(e) => handleChange('supplyCost', e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full pl-7 pr-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Travel Cost</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.travelCost ?? ''}
                  onChange={(e) => handleChange('travelCost', e.target.value ? Number(e.target.value) : undefined)}
                  className="w-full pl-7 pr-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500"
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
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ocean-500 resize-none"
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
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-ocean-600 text-white rounded-lg hover:bg-ocean-700 transition-colors disabled:opacity-50"
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
