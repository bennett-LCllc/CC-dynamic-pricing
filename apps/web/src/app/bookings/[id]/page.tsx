'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getBooking, deleteBooking } from '@/lib/api';
import type { Booking } from '@cc-ops/shared';
import BookingForm from '@/components/bookings/BookingForm';
import {
  ArrowLeft, Edit3, Trash2, MapPin, User, Mail, Phone,
  Calendar, DollarSign, Bed, PawPrint, Clock, Loader2,
  AlertTriangle, CheckCircle2,
} from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PlatformBadge } from '@/components/shared/PlatformBadge';

export default function BookingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchBooking = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getBooking(id);
      setBooking(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load booking');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooking();
  }, [id]);

  const handleDelete = async () => {
    setDeleteLoading(true);
    try {
      await deleteBooking(id);
      router.push('/bookings');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to cancel booking');
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-ocean-500 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Booking not found.
      </div>
    );
  }

  const checkIn = new Date(booking.checkIn);
  const checkOut = new Date(booking.checkOut);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isActive =
    checkIn <= today &&
    checkOut >= today &&
    (booking.status === 'CONFIRMED' || booking.status === 'ACTIVE');

  const nights = booking.totalNights;

  return (
    <div>
      {/* Header */}
      <div className="bg-white border-b border-border px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/bookings"
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{booking.guestName}</h1>
                <StatusBadge status={booking.status} />
                {isActive && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-palm-100 text-palm-600 rounded-full text-xs font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-palm-500" />
                    Active Now
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                <PlatformBadge platform={booking.platform} />
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {checkIn.toLocaleDateString()} → {checkOut.toLocaleDateString()}
                </span>
                <span>{nights} nights</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEditForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted transition-colors"
            >
              <Edit3 className="w-4 h-4" />
              Edit
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-6">
        {/* Revenue summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="stat-card">
            <div className="stat-label">Total Amount</div>
            <div className="stat-value">
              ${Number(booking.totalAmount).toLocaleString()}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Nightly Rate</div>
            <div className="stat-value text-ocean-600">
              ${Number(booking.nightlyRate).toLocaleString()}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Nights</div>
            <div className="stat-value">{nights}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Subtotal</div>
            <div className="stat-value text-muted-foreground">
              ${Number(booking.subtotal).toLocaleString()}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Guest Info */}
          <div className="card p-6">
            <h3 className="font-semibold mb-4">Guest Information</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-ocean-50 rounded-lg">
                  <User className="w-4 h-4 text-ocean-600" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Name</div>
                  <div className="font-medium">{booking.guestName}</div>
                </div>
              </div>
              {booking.guestEmail && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-ocean-50 rounded-lg">
                    <Mail className="w-4 h-4 text-ocean-600" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Email</div>
                    <div className="font-medium">{booking.guestEmail}</div>
                  </div>
                </div>
              )}
              {booking.guestPhone && (
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-ocean-50 rounded-lg">
                    <Phone className="w-4 h-4 text-ocean-600" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Phone</div>
                    <div className="font-medium">{booking.guestPhone}</div>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-6 pt-2">
                <div className="flex items-center gap-2 text-sm">
                  <Bed className="w-4 h-4 text-muted-foreground" />
                  <span>{booking.guestCount} guests</span>
                </div>
                {booking.petCount > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <PawPrint className="w-4 h-4 text-muted-foreground" />
                    <span>{booking.petCount} pets</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stay Details */}
          <div className="card p-6">
            <h3 className="font-semibold mb-4">Stay Details</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-xs text-muted-foreground">Check-In</div>
                  <div className="font-medium flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    {checkIn.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" />
                    {booking.checkInTime}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Check-Out</div>
                  <div className="font-medium flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                    {checkOut.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3" />
                    {booking.checkoutTime}
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-border">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-muted-foreground">Platform</div>
                    <div className="mt-1">
                      <PlatformBadge platform={booking.platform} />
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Source</div>
                    <div className="font-medium text-sm mt-1">
                      {booking.source}
                    </div>
                  </div>
                </div>
              </div>

              {booking.platformBookingId && (
                <div className="pt-2 border-t border-border">
                  <div className="text-xs text-muted-foreground">
                    Platform Booking ID
                  </div>
                  <div className="font-mono text-sm mt-0.5">
                    {booking.platformBookingId}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Financial Breakdown */}
        <div className="card p-6">
          <h3 className="font-semibold mb-4">Financial Breakdown</h3>
          <div className="max-w-md space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                ${Number(booking.nightlyRate).toLocaleString()} × {nights} nights
              </span>
              <span className="font-medium">
                ${Number(booking.subtotal).toLocaleString()}
              </span>
            </div>
            {Number(booking.cleaningFee) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Cleaning fee</span>
                <span className="font-medium">
                  ${Number(booking.cleaningFee).toLocaleString()}
                </span>
              </div>
            )}
            {Number(booking.petFee) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Pet fee</span>
                <span className="font-medium">
                  ${Number(booking.petFee).toLocaleString()}
                </span>
              </div>
            )}
            {Number(booking.platformFee) > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Platform fee</span>
                <span className="font-medium text-red-600">
                  -${Number(booking.platformFee).toLocaleString()}
                </span>
              </div>
            )}
            <div className="flex justify-between text-base font-semibold pt-3 border-t border-border">
              <span>Total</span>
              <span>${Number(booking.totalAmount).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {booking.notes && (
          <div className="card p-6">
            <h3 className="font-semibold mb-2">Notes</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {booking.notes}
            </p>
          </div>
        )}

        {/* Metadata */}
        <div className="text-xs text-muted-foreground space-y-1">
          <div>Created: {new Date(booking.createdAt).toLocaleString()}</div>
          <div>Last updated: {new Date(booking.updatedAt).toLocaleString()}</div>
        </div>
      </div>

      {/* Edit Modal */}
      {showEditForm && booking && (
        <BookingForm
          booking={booking}
          onClose={() => setShowEditForm(false)}
          onSaved={() => {
            setShowEditForm(false);
            fetchBooking();
          }}
        />
      )}

      {/* Cancel Confirmation */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-full">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold">Cancel Booking?</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-6">
              This will cancel the booking for{' '}
              <strong>{booking.guestName}</strong> from{' '}
              {checkIn.toLocaleDateString()} to {checkOut.toLocaleDateString()}.
              The booking status will be set to CANCELLED.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                Keep Booking
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleteLoading ? 'Cancelling…' : 'Cancel Booking'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
