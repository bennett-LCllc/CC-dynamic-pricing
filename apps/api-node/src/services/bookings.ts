/**
 * Booking service layer — Prisma business logic for booking CRUD.
 */

import { PrismaClient, BookingStatus } from '@cc-ops/db';
import type { CreateBookingInput, UpdateBookingInput } from '@cc-ops/shared';

const prisma = new PrismaClient();

// ============================================================
// List — all bookings with property info
// ============================================================

export async function getBookings(params?: {
  propertyId?: string;
  status?: string;
  from?: string;
  to?: string;
}) {
  const where: any = {};

  if (params?.propertyId) where.propertyId = params.propertyId;
  if (params?.status) where.status = params.status;
  if (params?.from || params?.to) {
    where.checkIn = {};
    if (params?.from) where.checkIn.gte = new Date(params.from);
    if (params?.to) where.checkIn.lte = new Date(params.to);
  }

  return prisma.booking.findMany({
    where,
    orderBy: { checkIn: 'asc' },
    include: {
      property: {
        select: { id: true, name: true, slug: true, address: true, zipCode: true },
      },
    },
  });
}

// ============================================================
// Calendar — bookings grouped by date range
// ============================================================

export async function getBookingsCalendar(params: {
  from: string;
  to: string;
  propertyId?: string;
}) {
  const bookings = await prisma.booking.findMany({
    where: {
      status: { notIn: [BookingStatus.CANCELLED, BookingStatus.NO_SHOW] },
      checkIn: { lte: new Date(params.to) },
      checkOut: { gte: new Date(params.from) },
      ...(params.propertyId ? { propertyId: params.propertyId } : {}),
    },
    orderBy: { checkIn: 'asc' },
    include: {
      property: {
        select: { id: true, name: true },
      },
    },
  });

  return bookings;
}

// ============================================================
// Detail — single booking with all relations
// ============================================================

export async function getBooking(id: string) {
  return prisma.booking.findUnique({
    where: { id },
    include: {
      property: {
        select: { id: true, name: true, slug: true, address: true, zipCode: true, baseRate: true },
      },
      messages: {
        orderBy: { sentAt: 'desc' },
        take: 20,
      },
      cleaningJobs: {
        orderBy: { scheduledStart: 'desc' },
        include: {
          cleaner: { select: { name: true, phone: true } },
        },
      },
    },
  });
}

// ============================================================
// Create
// ============================================================

export async function createBooking(data: CreateBookingInput) {
  // Validate dates
  const checkIn = new Date(data.checkIn);
  const checkOut = new Date(data.checkOut);
  if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
    throw new Error('Invalid date format for checkIn or checkOut');
  }
  if (checkOut <= checkIn) {
    throw new Error('checkOut must be after checkIn');
  }

  // Auto-calculate nights and total if not provided
  const nights = data.totalNights || Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
  const subtotal = data.subtotal || (Number(data.nightlyRate) * nights);
  const totalAmount = data.totalAmount || subtotal + Number(data.cleaningFee || 0) + Number(data.petFee || 0);

  if (isNaN(totalAmount)) {
    throw new Error('Invalid amount calculation — check numeric fields');
  }

  // Check for overlapping bookings on the same property
  const overlapping = await prisma.booking.findFirst({
    where: {
      propertyId: data.propertyId,
      status: { notIn: [BookingStatus.CANCELLED, BookingStatus.NO_SHOW] },
      checkIn: { lt: checkOut },
      checkOut: { gt: checkIn },
    },
  });
  if (overlapping) {
    throw new Error('Property is already booked for the selected dates');
  }

  return prisma.booking.create({
    data: {
      propertyId: data.propertyId,
      platform: data.platform || 'DIRECT',
      platformBookingId: data.platformBookingId,
      guestName: data.guestName,
      guestEmail: data.guestEmail,
      guestPhone: data.guestPhone,
      guestCount: data.guestCount || 1,
      petCount: data.petCount || 0,
      checkIn: new Date(data.checkIn),
      checkOut: new Date(data.checkOut),
      checkInTime: data.checkInTime || '16:00',
      checkoutTime: data.checkoutTime || '11:00',
      nightlyRate: data.nightlyRate,
      totalNights: nights,
      subtotal: subtotal,
      cleaningFee: data.cleaningFee || 0,
      petFee: data.petFee || 0,
      platformFee: data.platformFee || 0,
      totalAmount: totalAmount,
      status: data.status || BookingStatus.CONFIRMED,
      source: data.source || 'DIRECT',
      notes: data.notes,
    },
    include: {
      property: {
        select: { id: true, name: true, slug: true, address: true },
      },
    },
  });
}

// ============================================================
// Update
// ============================================================

export async function updateBooking(id: string, data: UpdateBookingInput) {
  const updateData: any = {};

  if (data.propertyId) updateData.propertyId = data.propertyId;
  if (data.platform) updateData.platform = data.platform;
  if (data.platformBookingId !== undefined) updateData.platformBookingId = data.platformBookingId;
  if (data.guestName !== undefined) updateData.guestName = data.guestName;
  if (data.guestEmail !== undefined) updateData.guestEmail = data.guestEmail;
  if (data.guestPhone !== undefined) updateData.guestPhone = data.guestPhone;
  if (data.guestCount !== undefined) updateData.guestCount = data.guestCount;
  if (data.petCount !== undefined) updateData.petCount = data.petCount;
  if (data.checkIn) updateData.checkIn = new Date(data.checkIn);
  if (data.checkOut) updateData.checkOut = new Date(data.checkOut);
  if (data.checkInTime) updateData.checkInTime = data.checkInTime;
  if (data.checkoutTime) updateData.checkoutTime = data.checkoutTime;
  if (data.nightlyRate !== undefined) updateData.nightlyRate = data.nightlyRate;
  if (data.totalNights !== undefined) updateData.totalNights = data.totalNights;
  if (data.subtotal !== undefined) updateData.subtotal = data.subtotal;
  if (data.cleaningFee !== undefined) updateData.cleaningFee = data.cleaningFee;
  if (data.petFee !== undefined) updateData.petFee = data.petFee;
  if (data.platformFee !== undefined) updateData.platformFee = data.platformFee;
  if (data.totalAmount !== undefined) updateData.totalAmount = data.totalAmount;
  if (data.status) updateData.status = data.status;
  if (data.source) updateData.source = data.source;
  if (data.notes !== undefined) updateData.notes = data.notes;

  return prisma.booking.update({
    where: { id },
    data: updateData,
    include: {
      property: {
        select: { id: true, name: true, slug: true, address: true },
      },
    },
  });
}

// ============================================================
// Delete
// ============================================================

export async function deleteBooking(id: string) {
  // Soft delete — mark as cancelled
  return prisma.booking.update({
    where: { id },
    data: { status: BookingStatus.CANCELLED },
  });
}
