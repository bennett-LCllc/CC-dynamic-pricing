'use client';

import { Header } from '@/components/shared/Header';
import { PlatformBadge } from '@/components/shared/PlatformBadge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { getBookingsCalendar, getProperties } from '@/lib/api';
import type { Booking, PropertyListItem } from '@cc-ops/shared';
import { Calendar, ChevronLeft, ChevronRight, DollarSign, Loader2, MapPin } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';

// ─── Date helpers ───────────────────────────────────────────────────────────

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

function startOfWeek(d: Date): Date {
  const day = d.getDay();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
}

function endOfWeek(d: Date): Date {
  const day = d.getDay();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + (6 - day));
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function addWeeks(d: Date, n: number): Date {
  const result = new Date(d);
  result.setDate(result.getDate() + n * 7);
  return result;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isToday(d: Date): boolean {
  return isSameDay(d, new Date());
}

function formatISODate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function toDate(str: string): Date {
  // Parse ISO string or YYYY-MM-DD as local time
  const datePart = str.substring(0, 10);
  const [y, m, d] = datePart.split('-').map(Number);
  return new Date(y, m - 1, d);
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// ─── Property color palette ─────────────────────────────────────────────────

const PROPERTY_COLORS = [
  { bg: 'bg-ocean-100', text: 'text-ocean-700', border: 'border-ocean-300', dot: 'bg-ocean-500' },
  { bg: 'bg-palm-100', text: 'text-palm-700', border: 'border-palm-300', dot: 'bg-palm-500' },
  { bg: 'bg-sand-100', text: 'text-sand-700', border: 'border-sand-300', dot: 'bg-sand-500' },
  { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-300', dot: 'bg-rose-500' },
  {
    bg: 'bg-violet-100',
    text: 'text-violet-700',
    border: 'border-violet-300',
    dot: 'bg-violet-500',
  },
  { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300', dot: 'bg-amber-500' },
];

function getPropertyColor(propertyId: string, colorMap: Map<string, number>) {
  if (!colorMap.has(propertyId)) {
    colorMap.set(propertyId, colorMap.size % PROPERTY_COLORS.length);
  }
  return PROPERTY_COLORS[colorMap.get(propertyId)! % PROPERTY_COLORS.length];
}

// ─── Types ──────────────────────────────────────────────────────────────────

type ViewMode = 'month' | 'week';

interface CalendarDay {
  date: Date;
  inMonth: boolean;
}

// ─── Booking chip on a calendar cell ────────────────────────────────────────

function BookingChip({
  booking,
  color,
}: {
  booking: Booking;
  color: { bg: string; text: string; border: string };
}) {
  const ci = toDate(booking.checkIn);
  const co = toDate(booking.checkOut);

  return (
    <Link href={`/bookings/${booking.id}`}>
      <div
        className={`text-xs px-1.5 py-0.5 rounded ${color.bg} ${color.text} border ${color.border} hover:opacity-80 transition-opacity truncate cursor-pointer leading-tight`}
        title={`${booking.guestName} — ${ci.toLocaleDateString()} → ${co.toLocaleDateString()}`}
      >
        <span className="font-medium">{booking.guestName}</span>
      </div>
    </Link>
  );
}

// ─── Calendar cell ──────────────────────────────────────────────────────────

function CalendarCell({
  day,
  bookings,
  colorMap,
  isHeader,
}: {
  day: CalendarDay;
  bookings: Booking[];
  colorMap: Map<string, number>;
  isHeader?: boolean;
}) {
  const dayStr = formatISODate(day.date);
  const today = isToday(day.date);

  // Find bookings that overlap this day (compare YYYY-MM-DD date strings)
  const cellBookings = bookings.filter((b) => {
    const ci = b.checkIn.substring(0, 10);
    const co = b.checkOut.substring(0, 10);
    return dayStr >= ci && dayStr <= co;
  });

  if (isHeader) {
    return (
      <div className="text-center text-xs font-semibold text-muted-foreground py-2 uppercase tracking-wide">
        {DAY_NAMES[day.date.getDay()]}
      </div>
    );
  }

  return (
    <div
      className={`min-h-[100px] border-b border-r border-border p-1.5 ${
        !day.inMonth ? 'bg-muted/30' : 'bg-white'
      } ${today ? 'ring-2 ring-inset ring-ocean-400' : ''}`}
    >
      <div
        className={`text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full ${
          today
            ? 'bg-ocean-500 text-white'
            : day.inMonth
              ? 'text-foreground'
              : 'text-muted-foreground/50'
        }`}
      >
        {day.date.getDate()}
      </div>
      <div className="space-y-0.5">
        {cellBookings.slice(0, 3).map((b, i) => {
          const color = getPropertyColor(b.propertyId, colorMap);
          return <BookingChip key={`${b.id}-${dayStr}-${i}`} booking={b} color={color} />;
        })}
        {cellBookings.length > 3 && (
          <div className="text-xs text-muted-foreground px-1.5">
            +{cellBookings.length - 3} more
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Legend ─────────────────────────────────────────────────────────────────

function Legend({
  properties,
  colorMap,
}: {
  properties: PropertyListItem[];
  colorMap: Map<string, number>;
}) {
  if (properties.length === 0) return null;

  return (
    <div className="flex items-center gap-4 flex-wrap">
      {properties.map((p) => {
        const color = getPropertyColor(p.id, colorMap);
        return (
          <div key={p.id} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={`w-2.5 h-2.5 rounded-full ${color.dot}`} />
            <span>{p.name}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Main page ──────────────────────────────────────────────────────────────

export default function BookingsCalendarPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [properties, setProperties] = useState<PropertyListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Color map stable across renders
  const colorMap = useMemo(() => new Map<string, number>(), []);

  // Compute the date range for the API call
  const { rangeStart, rangeEnd } = useMemo(() => {
    let start: Date, end: Date;
    if (viewMode === 'month') {
      const som = startOfMonth(currentDate);
      const eom = endOfMonth(currentDate);
      start = startOfWeek(som);
      end = endOfWeek(eom);
    } else {
      start = startOfWeek(currentDate);
      end = endOfWeek(currentDate);
    }
    return { rangeStart: formatISODate(start), rangeEnd: formatISODate(end) };
  }, [viewMode, currentDate]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [bookingsData, propertiesData] = await Promise.all([
        getBookingsCalendar({ from: rangeStart, to: rangeEnd }),
        getProperties().catch(() => [] as PropertyListItem[]),
      ]);
      setBookings(bookingsData);
      setProperties(propertiesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load calendar');
    } finally {
      setLoading(false);
    }
  }, [rangeStart, rangeEnd]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Build calendar grid days
  const days: CalendarDay[] = useMemo(() => {
    if (viewMode === 'month') {
      const som = startOfMonth(currentDate);
      const eom = endOfMonth(currentDate);
      const gridStart = startOfWeek(som);
      const gridEnd = endOfWeek(eom);
      const result: CalendarDay[] = [];
      const cursor = new Date(gridStart);
      while (cursor <= gridEnd) {
        result.push({
          date: new Date(cursor),
          inMonth: cursor.getMonth() === currentDate.getMonth(),
        });
        cursor.setDate(cursor.getDate() + 1);
      }
      return result;
    } else {
      const ws = startOfWeek(currentDate);
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(ws);
        d.setDate(d.getDate() + i);
        return { date: d, inMonth: true };
      });
    }
  }, [viewMode, currentDate]);

  // Navigation
  const goPrev = () => {
    setCurrentDate((d) => (viewMode === 'month' ? addMonths(d, -1) : addWeeks(d, -1)));
  };
  const goNext = () => {
    setCurrentDate((d) => (viewMode === 'month' ? addMonths(d, 1) : addWeeks(d, 1)));
  };
  const goToday = () => setCurrentDate(new Date());

  const title =
    viewMode === 'month'
      ? `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`
      : (() => {
          const ws = startOfWeek(currentDate);
          const we = endOfWeek(currentDate);
          if (ws.getMonth() === we.getMonth()) {
            return `${MONTH_NAMES[ws.getMonth()]} ${ws.getDate()}–${we.getDate()}, ${ws.getFullYear()}`;
          }
          return `${MONTH_NAMES[ws.getMonth()]} ${ws.getDate()} – ${MONTH_NAMES[we.getMonth()]} ${we.getDate()}, ${we.getFullYear()}`;
        })();

  // Summary stats for the visible range
  const stats = useMemo(() => {
    const rangeBookings = bookings.filter((b) => {
      const ci = b.checkIn;
      const co = b.checkOut;
      return ci <= rangeEnd && co >= rangeStart;
    });
    const totalRevenue = rangeBookings
      .filter((b) => b.status !== 'CANCELLED' && b.status !== 'NO_SHOW')
      .reduce((sum, b) => sum + Number(b.totalAmount), 0);
    const totalNights = rangeBookings
      .filter((b) => b.status !== 'CANCELLED' && b.status !== 'NO_SHOW')
      .reduce((sum, b) => sum + b.totalNights, 0);
    return { count: rangeBookings.length, revenue: totalRevenue, nights: totalNights };
  }, [bookings, rangeStart, rangeEnd]);

  return (
    <div>
      <Header title="Booking Calendar" subtitle="Visual overview of all reservations" />
      <div className="p-8 space-y-6">
        {/* Error */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Controls bar */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            {/* Prev / Next */}
            <div className="flex items-center gap-1">
              <button
                onClick={goPrev}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                aria-label="Previous"
              >
                <ChevronLeft className="w-5 h-5 text-muted-foreground" />
              </button>
              <button
                onClick={goToday}
                className="px-3 py-1.5 text-sm font-medium border border-border rounded-lg hover:bg-muted transition-colors"
              >
                Today
              </button>
              <button
                onClick={goNext}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                aria-label="Next"
              >
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Title */}
            <h2 className="text-lg font-semibold text-foreground min-w-[200px]">{title}</h2>

            {/* View mode toggle */}
            <div className="flex items-center border border-border rounded-lg overflow-hidden">
              <button
                onClick={() => {
                  setViewMode('month');
                  setCurrentDate(new Date());
                }}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  viewMode === 'month'
                    ? 'bg-ocean-500 text-white'
                    : 'bg-white text-muted-foreground hover:bg-muted'
                }`}
              >
                Month
              </button>
              <button
                onClick={() => {
                  setViewMode('week');
                  setCurrentDate(new Date());
                }}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  viewMode === 'week'
                    ? 'bg-ocean-500 text-white'
                    : 'bg-white text-muted-foreground hover:bg-muted'
                }`}
              >
                Week
              </button>
            </div>
          </div>

          {/* Legend */}
          <Legend properties={properties} colorMap={colorMap} />
        </div>

        {/* Summary stats */}
        {!loading && stats.count > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <div className="stat-card">
              <div className="stat-label">Bookings</div>
              <div className="stat-value">{stats.count}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Total Nights</div>
              <div className="stat-value text-ocean-600">{stats.nights}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Revenue</div>
              <div className="stat-value text-palm-600">${stats.revenue.toLocaleString()}</div>
            </div>
          </div>
        )}

        {/* Calendar grid */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-ocean-500 animate-spin" />
          </div>
        ) : (
          <div className="card overflow-hidden">
            {/* Day name headers */}
            <div className="grid grid-cols-7 border-t border-l border-border bg-muted/50">
              {days.slice(0, 7).map((d, i) => (
                <CalendarCell
                  key={`header-${i}`}
                  day={d}
                  bookings={[]}
                  colorMap={colorMap}
                  isHeader
                />
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 border-l border-border">
              {days.map((day) => (
                <CalendarCell
                  key={formatISODate(day.date)}
                  day={day}
                  bookings={bookings}
                  colorMap={colorMap}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {!loading && bookings.length === 0 && (
          <div className="card p-12 text-center">
            <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Bookings in This Period</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Navigate to a different {viewMode} or create new bookings to see them on the calendar.
            </p>
          </div>
        )}

        {/* Upcoming bookings sidebar list */}
        {!loading && bookings.length > 0 && (
          <div className="card p-6">
            <h3 className="font-semibold mb-4">Bookings in This Period</h3>
            <div className="space-y-3">
              {bookings.map((b) => {
                const ci = toDate(b.checkIn);
                const co = toDate(b.checkOut);
                const color = getPropertyColor(b.propertyId, colorMap);
                const property = properties.find((p) => p.id === b.propertyId);
                return (
                  <Link key={b.id} href={`/bookings/${b.id}`}>
                    <div className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors group">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${color.dot}`} />
                        <div className="min-w-0">
                          <div className="font-medium text-sm group-hover:text-ocean-600 transition-colors truncate">
                            {b.guestName}
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            {property && (
                              <span className="flex items-center gap-0.5">
                                <MapPin className="w-3 h-3" />
                                {property.name}
                              </span>
                            )}
                            <span>
                              {ci.toLocaleDateString()} → {co.toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <PlatformBadge platform={b.platform} />
                        <StatusBadge status={b.status} />
                        <span className="text-sm font-medium flex items-center gap-0.5">
                          <DollarSign className="w-3 h-3 text-muted-foreground" />
                          {Number(b.totalAmount).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
