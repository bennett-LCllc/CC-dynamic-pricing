/**
 * Dashboard service — aggregated stats for the main dashboard.
 */

import { PrismaClient, BookingStatus, JobStatus, PropertyStatus } from '@cc-ops/db';

const prisma = new PrismaClient();

export async function getDashboardOverview() {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // ── Properties ──
  const [totalProperties, activeProperties] = await Promise.all([
    prisma.property.count(),
    prisma.property.count({ where: { status: PropertyStatus.ACTIVE } }),
  ]);

  // ── Bookings — today's activity ──
  const [checkInsToday, checkOutsToday, upcomingBookings] = await Promise.all([
    // Check-ins today
    prisma.booking.count({
      where: {
        checkIn: { gte: todayStart, lt: todayEnd },
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.ACTIVE] },
      },
    }),
    // Check-outs today
    prisma.booking.count({
      where: {
        checkOut: { gte: todayStart, lt: todayEnd },
        status: { in: [BookingStatus.ACTIVE, BookingStatus.CONFIRMED] },
      },
    }),
    // Upcoming bookings (next 30 days)
    prisma.booking.count({
      where: {
        checkIn: { gte: todayEnd, lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) },
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.ACTIVE] },
      },
    }),
  ]);

  // ── MTD Revenue (from bookings that started this month) ──
  const mtdBookings = await prisma.booking.findMany({
    where: {
      checkIn: { gte: monthStart, lte: now },
      status: { notIn: [BookingStatus.CANCELLED, BookingStatus.NO_SHOW] },
    },
    select: { totalAmount: true },
  });
  const mtdRevenue = mtdBookings.reduce((sum, b) => sum + Number(b.totalAmount), 0);

  // ── Occupancy (unique booked days this month / total days in month) ──
  const monthBookings = await prisma.booking.findMany({
    where: {
      checkIn: { lte: now },
      checkOut: { gte: monthStart },
      status: { notIn: [BookingStatus.CANCELLED, BookingStatus.NO_SHOW] },
    },
    select: { checkIn: true, checkOut: true, propertyId: true },
  });
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const bookedDays = new Set<string>(); // "propertyId:day" to count unique property-days
  for (const b of monthBookings) {
    const start = new Date(Math.max(new Date(b.checkIn).getTime(), monthStart.getTime()));
    const end = new Date(Math.min(new Date(b.checkOut).getTime(), now.getTime()));
    for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
      bookedDays.add(`${b.propertyId}:${d.getDate()}`);
    }
  }
  // Occupancy = total booked property-days / (active properties * days in month) * 100
  const occupancyDenominator = Math.max(activeProperties * daysInMonth, 1);
  const occupancyRate = Math.round((bookedDays.size / occupancyDenominator) * 100);

  // ── Cleaning jobs today ──
  const [cleaningScheduledToday, cleaningCompletedToday] = await Promise.all([
    prisma.cleaningJob.count({
      where: {
        scheduledStart: { gte: todayStart, lt: todayEnd },
        status: { in: [JobStatus.PENDING, JobStatus.ASSIGNED, JobStatus.SCHEDULED] },
      },
    }),
    prisma.cleaningJob.count({
      where: { actualEnd: { gte: todayStart, lt: todayEnd }, status: JobStatus.COMPLETED },
    }),
  ]);

  // ── Lawn jobs today ──
  const [lawnScheduledToday, lawnCompletedToday] = await Promise.all([
    prisma.lawnJob.count({
      where: {
        scheduledDate: { gte: todayStart, lt: todayEnd } as any,
        status: { in: [JobStatus.PENDING, JobStatus.ASSIGNED, JobStatus.SCHEDULED] },
      },
    }),
    prisma.lawnJob.count({
      where: {
        scheduledDate: { gte: todayStart, lt: todayEnd } as any,
        status: JobStatus.COMPLETED,
      },
    }),
  ]);

  // ── MTD Expenses by LLC ──
  const expenses = await prisma.expense.findMany({
    where: { date: { gte: monthStart, lte: now } },
    select: { amount: true, incurredBy: true },
  });
  let strExpenses = 0, lawnExpenses = 0, cleaningExpenses = 0;
  for (const e of expenses) {
    const amt = Number(e.amount);
    if (e.incurredBy === 'STR') strExpenses += amt;
    else if (e.incurredBy === 'LAWN') lawnExpenses += amt;
    else if (e.incurredBy === 'CLEANING') cleaningExpenses += amt;
  }

  // ── Active customers (Lawn + Cleaning external) ──
  const activeCustomers = await prisma.customer.count({
    where: { status: 'ACTIVE' },
  });

  // ── Recent activity (last 10 events across all tables) — simplified to latest bookings + jobs ──
  const recentBookings = await prisma.booking.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5,
    include: { property: { select: { name: true } } },
  });
  const recentCleaningJobs = await prisma.cleaningJob.findMany({
    orderBy: { createdAt: 'desc' },
    take: 3,
    include: { property: { select: { name: true } }, cleaner: { select: { name: true } } },
  });

  // ── Alerts (issues that need attention) ──
  const alerts: Array<{ id: string; type: 'info' | 'warning' | 'critical'; title: string; description: string; propertyName?: string }> = [];

  // Properties with no bookings in next 30 days
  const propertiesWithNoUpcoming = await prisma.property.findMany({
    where: {
      status: PropertyStatus.ACTIVE,
      NOT: {
        bookings: {
          some: {
            checkIn: { gte: now, lte: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) },
            status: { in: [BookingStatus.CONFIRMED, BookingStatus.ACTIVE] },
          },
        },
      },
    },
    select: { id: true, name: true },
    take: 5,
  });
  for (const p of propertiesWithNoUpcoming) {
    alerts.push({
      id: `no-booking-${p.id}`,
      type: 'warning',
      title: 'No upcoming bookings (30 days)',
      description: `${p.name} has no confirmed bookings in the next 30 days.`,
      propertyName: p.name,
    });
  }

  // Overdue cleaning jobs (scheduled before today, not completed)
  const overdueCleaning = await prisma.cleaningJob.count({
    where: {
      scheduledStart: { lt: todayStart },
      status: { in: [JobStatus.PENDING, JobStatus.ASSIGNED] },
    },
  });
  if (overdueCleaning > 0) {
    alerts.push({
      id: 'overdue-cleaning',
      type: 'critical',
      title: `${overdueCleaning} overdue cleaning job${overdueCleaning > 1 ? 's' : ''}`,
      description: 'Cleaning jobs scheduled before today are still pending.',
    });
  }

  // Overdue lawn jobs
  const overdueLawn = await prisma.lawnJob.count({
    where: {
      scheduledDate: { lt: todayStart } as any,
      status: { in: [JobStatus.PENDING, JobStatus.ASSIGNED] },
    },
  });
  if (overdueLawn > 0) {
    alerts.push({
      id: 'overdue-lawn',
      type: 'critical',
      title: `${overdueLawn} overdue lawn job${overdueLawn > 1 ? 's' : ''}`,
      description: 'Lawn jobs scheduled before today are still pending.',
    });
  }

  // Today's check-ins without cleaning scheduled
  const checkInsWithoutCleaning = await prisma.booking.findMany({
    where: {
      checkOut: { gte: todayStart, lt: todayEnd },
      status: { in: [BookingStatus.ACTIVE, BookingStatus.CONFIRMED] },
      NOT: {
        cleaningJobs: {
          some: {
            scheduledStart: { gte: todayStart, lt: new Date(todayEnd.getTime() + 24 * 60 * 60 * 1000) },
          },
        },
      },
    },
    include: { property: { select: { name: true } } },
    take: 5,
  });
  for (const b of checkInsWithoutCleaning) {
    alerts.push({
      id: `no-cleaning-${b.id}`,
      type: 'warning',
      title: 'Checkout today — no cleaning scheduled',
      description: `${b.property.name} has a guest checking out but no cleaning job scheduled.`,
      propertyName: b.property.name,
    });
  }

  return {
    properties: {
      total: totalProperties,
      active: activeProperties,
      inactive: totalProperties - activeProperties,
      occupancyRate,
    },
    today: {
      checkIns: checkInsToday,
      checkOuts: checkOutsToday,
      cleaningScheduled: cleaningScheduledToday,
      cleaningCompleted: cleaningCompletedToday,
      lawnScheduled: lawnScheduledToday,
      lawnCompleted: lawnCompletedToday,
    },
    revenue: {
      mtd: mtdRevenue,
      projectedMonthly: mtdRevenue / Math.max(now.getDate(), 1) * daysInMonth,
    },
    upcomingBookings,
    llcs: {
      str: {
        units: `${activeProperties} / 15`,
        mtdRevenue,
        occupancy: `${occupancyRate}%`,
      },
      lawn: {
        clients: `${activeCustomers} / 45`,
        mtdRevenue: lawnExpenses, // Will be 0 until revenue tracking is added
        jobsToday: lawnScheduledToday,
      },
      cleaning: {
        clients: `${activeCustomers} / 50`,
        mtdRevenue: cleaningExpenses, // Will be 0 until revenue tracking is added
        turnoversToday: cleaningScheduledToday,
      },
    },
    expenses: {
      str: strExpenses,
      lawn: lawnExpenses,
      cleaning: cleaningExpenses,
    },
    recentActivity: {
      bookings: recentBookings.map((b) => ({
        id: b.id,
        type: 'booking' as const,
        title: `New booking: ${b.guestName}`,
        property: b.property?.name ?? 'Unknown',
        date: b.createdAt,
        status: b.status,
        amount: Number(b.totalAmount),
      })),
      cleaningJobs: recentCleaningJobs.map((j) => ({
        id: j.id,
        type: 'cleaning' as const,
        title: `Cleaning: ${j.cleaner?.name ?? 'Unassigned'}`,
        property: j.property?.name ?? 'Unknown',
        date: j.scheduledStart,
        status: j.status,
      })),
    },
    alerts,
  };
}
