'use client';

import { useState, useEffect } from 'react';
import { createBooking, updateBooking } from '@/lib/api';
import type {
  Booking,
  CreateBookingInput,
  UpdateBookingInput,
  Platform,
  BookingStatus,
  BookingSource,
  PropertyListItem,
} from '@cc-ops/shared';
import { X } from 'lucide-react';

interface BookingFormProps {
  booking?: Booking | null;
  onClose: () => void;
  onSaved: () => void;
}

const PLATFORMS: { value: Platform; label: string }[] = [
  { value: 'AIRBNB', label: 'Airbnb' },
  { value: 'VRBO', label: 'VRBO' },
  { value: 'BOOKING_COM', label: 'Booking.com' },
  { value: 'DIRECT', label: 'Direct' },
];

const STATUSES: { value: BookingStatus; label: string }[] = [
  { value: 'INQUIRY', label: 'Inquiry' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'NO_SHOW', label: 'No Show' },
];

const SOURCES: { value: BookingSource; label: string }[] = [
  { value: 'AIRBNB', label: 'Airbnb' },
  { value: 'VRBO', label: 'VRBO' },
  { value: 'BOOKING_COM', label: 'Booking.com' },
  { value: 'DIRECT', label: 'Direct' },
  { value: 'REFERRAL', label: 'Referral' },
];

const inputClass =
  'w-full px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-ring focus:outline-none';
const labelClass = 'block text-sm font-medium text-foreground mb-1';
const sectionClass = 'border-t border-border pt-4 mt-4';

export default function BookingForm({
  booking,
  onClose,
  onSaved,
}: BookingFormProps) {
  const isEditing = !!booking;

  const [form, setForm] = useState<CreateBookingInput>({
    propertyId: '',
    platform: 'DIRECT',
    platformBookingId: '',
    guestName: '',
    guestEmail: '',
    guestPhone: '',
    guestCount: 1,
    petCount: 0,
    checkIn: '',
    checkOut: '',
    checkInTime: '16:00',
    checkoutTime: '11:00',
    nightlyRate: 100,
    totalNights: 1,
    subtotal: 0,
    cleaningFee: 0,
    petFee: 0,
    platformFee: 0,
    totalAmount: 0,
    status: 'CONFIRMED',
    source: 'DIRECT',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [properties, setProperties] = useState<PropertyListItem[]>([]);

  // Load properties for the dropdown
  useEffect(() => {
    import('@/lib/api').then(({ getProperties }) => {
      getProperties()
        .then(setProperties)
        .catch(() => {});
    });
  }, []);

  useEffect(() => {
    if (booking) {
      setForm({
        propertyId: booking.propertyId,
        platform: booking.platform,
        platformBookingId: booking.platformBookingId ?? '',
        guestName: booking.guestName,
        guestEmail: booking.guestEmail ?? '',
        guestPhone: booking.guestPhone ?? '',
        guestCount: booking.guestCount,
        petCount: booking.petCount,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        checkInTime: booking.checkInTime,
        checkoutTime: booking.checkoutTime,
        nightlyRate: Number(booking.nightlyRate),
        totalNights: booking.totalNights,
        subtotal: Number(booking.subtotal),
        cleaningFee: Number(booking.cleaningFee),
        petFee: Number(booking.petFee),
        platformFee: Number(booking.platformFee),
        totalAmount: Number(booking.totalAmount),
        status: booking.status,
        source: booking.source,
        notes: booking.notes ?? '',
      });
    }
  }, [booking]);

  const update = (field: string, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isEditing && booking) {
        await updateBooking(booking.id, form as UpdateBookingInput);
      } else {
        await createBooking(form);
      }
      onSaved();
    } catch (err: any) {
      setError(err.message || 'Failed to save booking');
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
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border sticky top-0 bg-white rounded-t-xl z-10">
          <h2 className="text-lg font-semibold">
            {isEditing ? 'Edit Booking' : 'New Booking'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-muted rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* ── Property & Guest ── */}
          <div>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
              Property &amp; Guest
            </h3>
            <div className="space-y-3">
              <div>
                <label className={labelClass}>
                  Property <span className="text-red-500">*</span>
                </label>
                <select
                  className={inputClass}
                  value={form.propertyId}
                  onChange={(e) => update('propertyId', e.target.value)}
                  required
                >
                  <option value="">Select a property…</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — {p.address}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>
                  Guest Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  className={inputClass}
                  value={form.guestName}
                  onChange={(e) => update('guestName', e.target.value)}
                  placeholder="e.g. John Smith"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Email</label>
                  <input
                    type="email"
                    className={inputClass}
                    value={form.guestEmail ?? ''}
                    onChange={(e) => update('guestEmail', e.target.value)}
                    placeholder="guest@example.com"
                  />
                </div>
                <div>
                  <label className={labelClass}>Phone</label>
                  <input
                    type="tel"
                    className={inputClass}
                    value={form.guestPhone ?? ''}
                    onChange={(e) => update('guestPhone', e.target.value)}
                    placeholder="(361) 555-0123"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Guests</label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    className={inputClass}
                    value={form.guestCount ?? 1}
                    onChange={(e) =>
                      update('guestCount', parseInt(e.target.value) || 1)
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>Pets</label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    className={inputClass}
                    value={form.petCount ?? 0}
                    onChange={(e) =>
                      update('petCount', parseInt(e.target.value) || 0)
                    }
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ── Dates ── */}
          <div className={sectionClass}>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
              Dates
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>
                  Check-In Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  className={inputClass}
                  value={form.checkIn ? form.checkIn.slice(0, 10) : ''}
                  onChange={(e) => update('checkIn', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>
                  Check-Out Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  className={inputClass}
                  value={form.checkOut ? form.checkOut.slice(0, 10) : ''}
                  onChange={(e) => update('checkOut', e.target.value)}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Check-In Time</label>
                <input
                  type="time"
                  className={inputClass}
                  value={form.checkInTime ?? '16:00'}
                  onChange={(e) => update('checkInTime', e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Check-Out Time</label>
                <input
                  type="time"
                  className={inputClass}
                  value={form.checkoutTime ?? '11:00'}
                  onChange={(e) => update('checkoutTime', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* ── Pricing ── */}
          <div className={sectionClass}>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
              Pricing
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>
                  Nightly Rate ($) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className={inputClass}
                  value={form.nightlyRate}
                  onChange={(e) =>
                    update('nightlyRate', parseFloat(e.target.value) || 0)
                  }
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Nights</label>
                <input
                  type="number"
                  min={1}
                  className={inputClass}
                  value={form.totalNights ?? 1}
                  onChange={(e) =>
                    update('totalNights', parseInt(e.target.value) || 1)
                  }
                />
              </div>
              <div>
                <label className={labelClass}>Subtotal ($)</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className={inputClass}
                  value={form.subtotal ?? 0}
                  onChange={(e) =>
                    update('subtotal', parseFloat(e.target.value) || 0)
                  }
                />
              </div>
              <div>
                <label className={labelClass}>Cleaning Fee ($)</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className={inputClass}
                  value={form.cleaningFee ?? 0}
                  onChange={(e) =>
                    update('cleaningFee', parseFloat(e.target.value) || 0)
                  }
                />
              </div>
              <div>
                <label className={labelClass}>Pet Fee ($)</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className={inputClass}
                  value={form.petFee ?? 0}
                  onChange={(e) =>
                    update('petFee', parseFloat(e.target.value) || 0)
                  }
                />
              </div>
              <div>
                <label className={labelClass}>Platform Fee ($)</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  className={inputClass}
                  value={form.platformFee ?? 0}
                  onChange={(e) =>
                    update('platformFee', parseFloat(e.target.value) || 0)
                  }
                />
              </div>
            </div>
            <div className="mt-3">
              <label className={labelClass}>Total Amount ($)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                className={inputClass}
                value={form.totalAmount ?? 0}
                onChange={(e) =>
                  update('totalAmount', parseFloat(e.target.value) || 0)
                }
              />
            </div>
          </div>

          {/* ── Platform & Status ── */}
          <div className={sectionClass}>
            <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3">
              Platform &amp; Status
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelClass}>Platform</label>
                <select
                  className={inputClass}
                  value={form.platform}
                  onChange={(e) => update('platform', e.target.value)}
                >
                  {PLATFORMS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Status</label>
                <select
                  className={inputClass}
                  value={form.status}
                  onChange={(e) => update('status', e.target.value)}
                >
                  {STATUSES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Source</label>
                <select
                  className={inputClass}
                  value={form.source}
                  onChange={(e) => update('source', e.target.value)}
                >
                  {SOURCES.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-3">
              <label className={labelClass}>Platform Booking ID</label>
              <input
                type="text"
                className={inputClass}
                value={form.platformBookingId ?? ''}
                onChange={(e) => update('platformBookingId', e.target.value)}
                placeholder="e.g. HM4ABC123"
              />
            </div>
          </div>

          {/* ── Notes ── */}
          <div className={sectionClass}>
            <label className={labelClass}>Notes</label>
            <textarea
              className={inputClass}
              value={form.notes ?? ''}
              onChange={(e) => update('notes', e.target.value)}
              placeholder="Internal notes about this booking…"
              rows={3}
            />
          </div>

          {/* ── Actions ── */}
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
              className="px-6 py-2.5 bg-ocean-500 text-white rounded-lg font-medium hover:bg-ocean-600 transition-colors disabled:opacity-50"
            >
              {loading
                ? 'Saving…'
                : isEditing
                  ? 'Save Changes'
                  : 'Create Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
