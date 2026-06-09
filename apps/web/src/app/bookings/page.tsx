'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Header } from '@/components/shared/Header';
import { getBookings, getProperties } from '@/lib/api';
import type { Booking, PropertyListItem } from '@cc-ops/shared';
import BookingForm from '@/components/bookings/BookingForm';
import {
  Plus, CalendarDays, Search, Filter,
  Calendar, MapPin, DollarSign, ChevronRight,
} from 'lucide-react';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PlatformBadge } from '@/components/shared/PlatformBadge';

function BookingCard({
  booking,
  propertyName,
}: {
  booking: Booking;
  propertyName?: string;
}) {
  const checkIn = new Date(booking.checkIn);
  const checkOut = new Date(booking.checkOut);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const isActive =
    checkIn <= today &&
    checkOut >= today &&
    (booking.status === 'CONFIRMED' || booking.status === 'ACTIVE');
  const isUpcoming =
    checkIn > today &&
    booking.status !== 'CANCELLED' &&
    booking.status !== 'NO_SHOW' &&
    booking.status !== 'COMPLETED';

  return (
    <Link href={`/bookings/${booking.id}`}>
      <div className="card p-5 hover:shadow-md transition-shadow cursor-pointer group">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground group-hover:text-ocean-600 transition-colors truncate">
                {booking.guestName}
              </h3>
              {isActive && (
                <span
                  className="shrink-0 w-2 h-2 rounded-full bg-palm-500"
                  title="Active now"
                />
              )}
            </div>
            {booking.guestEmail && (
              <div className="text-sm text-muted-foreground truncate">
                {booking.guestEmail}
              </div>
            )}
          </div>
          <StatusBadge status={booking.status} />
        </div>

        {propertyName && (
          <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{propertyName}</span>
          </div>
        )}

        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {checkIn.toLocaleDateString()} → {checkOut.toLocaleDateString()}
          </span>
          <span>{booking.totalNights} nights</span>
        </div>

        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="flex items-center gap-2">
            <PlatformBadge platform={booking.platform} />
            {isUpcoming && (
              <span className="text-xs text-ocean-600 font-medium">Upcoming</span>
            )}
            {isActive && (
              <span className="text-xs text-palm-600 font-medium">Now</span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <DollarSign className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="font-semibold text-foreground">
              ${Number(booking.totalAmount).toLocaleString()}
            </span>
            <ChevronRight className="w-4 h-4 text-muted-foreground ml-1 group-hover:text-ocean-500 transition-colors" />
          </div>
        </div>
      </div>
    </Link>
  );
}

function SkeletonCard() {
  return (
    <div className="card p-5 animate-pulse">
      <div className="h-5 bg-muted rounded w-2/3 mb-2" />
      <div className="h-4 bg-muted rounded w-1/2 mb-3" />
      <div className="flex gap-4 mb-3">
        <div className="h-4 bg-muted rounded w-32" />
        <div className="h-4 bg-muted rounded w-16" />
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-border">
        <div className="h-5 bg-muted rounded w-16" />
        <div className="h-5 bg-muted rounded w-20" />
      </div>
    </div>
  );
}

type FilterStatus =
  | ''
  | 'CONFIRMED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'INQUIRY'
  | 'NO_SHOW';

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [properties, setProperties] = useState<PropertyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('');
  const [propertyFilter, setPropertyFilter] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [bookingsData, propertiesData] = await Promise.all([
        getBookings(),
        getProperties().catch(() => [] as PropertyListItem[]),
      ]);
      setBookings(bookingsData);
      setProperties(propertiesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Build a property ID → name map
  const propertyMap = new Map(properties.map((p) => [p.id, p.name]));

  // Filter bookings
  const filtered = bookings.filter((b) => {
    if (statusFilter && b.status !== statusFilter) return false;
    if (propertyFilter && b.propertyId !== propertyFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchGuest = b.guestName.toLowerCase().includes(q);
      const matchEmail = b.guestEmail?.toLowerCase().includes(q);
      const matchProperty = propertyMap
        .get(b.propertyId)
        ?.toLowerCase()
        .includes(q);
      if (!matchGuest && !matchEmail && !matchProperty) return false;
    }
    return true;
  });

  // Group into upcoming / active / past
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const active = filtered.filter((b) => {
    const ci = new Date(b.checkIn);
    const co = new Date(b.checkOut);
    return (
      ci <= today &&
      co >= today &&
      (b.status === 'CONFIRMED' || b.status === 'ACTIVE')
    );
  });
  const upcoming = filtered.filter((b) => {
    const ci = new Date(b.checkIn);
    return (
      ci > today &&
      b.status !== 'CANCELLED' &&
      b.status !== 'NO_SHOW' &&
      b.status !== 'COMPLETED'
    );
  });
  const past = filtered.filter((b) => {
    const co = new Date(b.checkOut);
    return (
      co < today ||
      b.status === 'CANCELLED' ||
      b.status === 'NO_SHOW' ||
      b.status === 'COMPLETED'
    );
  });

  const totalRevenue = filtered
    .filter((b) => b.status !== 'CANCELLED' && b.status !== 'NO_SHOW')
    .reduce((sum, b) => sum + Number(b.totalAmount), 0);

  return (
    <div>
      <Header
        title="Bookings"
        subtitle={`${filtered.length} ${filtered.length === 1 ? 'booking' : 'bookings'} total`}
      />
      <div className="p-8 space-y-6">
        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Top bar */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search guests, properties…"
                className="pl-9 pr-4 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-ring focus:outline-none w-64"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            {/* Status filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <select
                className="pl-9 pr-8 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-ring focus:outline-none appearance-none bg-white"
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as FilterStatus)
                }
              >
                <option value="">All Statuses</option>
                <option value="INQUIRY">Inquiry</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="ACTIVE">Active</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="NO_SHOW">No Show</option>
              </select>
            </div>
            {/* Property filter */}
            {properties.length > 0 && (
              <select
                className="px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-ring focus:outline-none appearance-none bg-white"
                value={propertyFilter}
                onChange={(e) => setPropertyFilter(e.target.value)}
              >
                <option value="">All Properties</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-ocean-500 text-white rounded-lg font-medium hover:bg-ocean-600 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Booking
          </button>
        </div>

        {/* Summary stats */}
        {!loading && filtered.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="stat-card">
              <div className="stat-label">Active Now</div>
              <div className="stat-value text-palm-600">{active.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Upcoming</div>
              <div className="stat-value text-ocean-600">{upcoming.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Bookings</div>
              <div className="stat-value">{filtered.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Revenue</div>
              <div className="stat-value">${totalRevenue.toLocaleString()}</div>
            </div>
          </div>
        )}

        {/* Content */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-12 text-center">
            <CalendarDays className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              {searchQuery || statusFilter || propertyFilter
                ? 'No Matching Bookings'
                : 'No Bookings Yet'}
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {searchQuery || statusFilter || propertyFilter
                ? 'Try adjusting your search or filters.'
                : 'Create your first booking to start tracking reservations.'}
            </p>
            {!searchQuery && !statusFilter && !propertyFilter && (
              <button
                onClick={() => setShowForm(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-ocean-500 text-white rounded-lg font-medium hover:bg-ocean-600 transition-colors mt-6"
              >
                <Plus className="w-4 h-4" />
                New Booking
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {/* Active */}
            {active.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-palm-500" />
                  Active Now ({active.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {active.map((b) => (
                    <BookingCard
                      key={b.id}
                      booking={b}
                      propertyName={propertyMap.get(b.propertyId)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming */}
            {upcoming.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-ocean-500" />
                  Upcoming ({upcoming.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {upcoming.map((b) => (
                    <BookingCard
                      key={b.id}
                      booking={b}
                      propertyName={propertyMap.get(b.propertyId)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Past */}
            {past.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground" />
                  Past ({past.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {past.map((b) => (
                    <BookingCard
                      key={b.id}
                      booking={b}
                      propertyName={propertyMap.get(b.propertyId)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showForm && (
        <BookingForm
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
