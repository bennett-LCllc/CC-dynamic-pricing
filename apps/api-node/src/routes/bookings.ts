/**
 * Booking routes — Express router for /api/bookings
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  getBookings,
  getBookingsCalendar,
  getBooking,
  createBooking,
  updateBooking,
  deleteBooking,
} from '../services/bookings';

const router = Router();

// ============================================================
// Validation schemas
// ============================================================

const baseSchema = z.object({
  propertyId: z.string().min(1, 'Property is required'),
  platform: z.enum(['AIRBNB', 'VRBO', 'BOOKING_COM', 'DIRECT']).optional(),
  platformBookingId: z.string().optional(),
  guestName: z.string().min(1, 'Guest name is required').max(200),
  guestEmail: z.string().email().optional().or(z.literal('')),
  guestPhone: z.string().max(20).optional(),
  guestCount: z.number().int().min(1).max(50).optional(),
  petCount: z.number().int().min(0).max(10).optional(),
  checkIn: z.string().datetime(),
  checkOut: z.string().datetime(),
  checkInTime: z.string().optional(),
  checkoutTime: z.string().optional(),
  nightlyRate: z.number().positive('Nightly rate must be positive'),
  totalNights: z.number().int().min(1).optional(),
  subtotal: z.number().nonnegative().optional(),
  cleaningFee: z.number().min(0).optional(),
  petFee: z.number().min(0).optional(),
  platformFee: z.number().min(0).optional(),
  totalAmount: z.number().nonnegative().optional(),
  status: z.enum(['INQUIRY', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
  source: z.enum(['AIRBNB', 'VRBO', 'BOOKING_COM', 'DIRECT', 'REFERRAL']).optional(),
  notes: z.string().max(2000).optional(),
});

const createSchema = baseSchema.refine(
  (data) => new Date(data.checkOut) > new Date(data.checkIn),
  { message: 'Check-out must be after check-in', path: ['checkOut'] },
);

const updateSchema = baseSchema.partial();

// ============================================================
// GET /api/bookings — List all bookings
// ============================================================

router.get('/', async (req: Request, res: Response) => {
  try {
    const bookings = await getBookings({
      propertyId: req.query.propertyId as string | undefined,
      status: req.query.status as string | undefined,
      from: req.query.from as string | undefined,
      to: req.query.to as string | undefined,
    });
    res.json({ data: bookings });
  } catch (err) {
    console.error('GET /api/bookings error:', err);
    res.status(500).json({ error: 'Failed to fetch bookings' });
  }
});

// ============================================================
// GET /api/bookings/calendar — Calendar view
// ============================================================

router.get('/calendar', async (req: Request, res: Response) => {
  const from = req.query.from as string;
  const to = req.query.to as string;

  if (!from || !to) {
    res.status(400).json({ error: 'from and to date parameters are required' });
    return;
  }

  try {
    const bookings = await getBookingsCalendar({
      from,
      to,
      propertyId: req.query.propertyId as string | undefined,
    });
    res.json({ data: bookings });
  } catch (err) {
    console.error('GET /api/bookings/calendar error:', err);
    res.status(500).json({ error: 'Failed to fetch calendar' });
  }
});

// ============================================================
// GET /api/bookings/:id — Get single booking
// ============================================================

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const booking = await getBooking(req.params.id);
    if (!booking) {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }
    res.json({ data: booking });
  } catch (err) {
    console.error(`GET /api/bookings/${req.params.id} error:`, err);
    res.status(500).json({ error: 'Failed to fetch booking' });
  }
});

// ============================================================
// POST /api/bookings — Create booking
// ============================================================

router.post('/', async (req: Request, res: Response) => {
  const result = createSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      error: 'Validation failed',
      details: result.error.flatten().fieldErrors,
    });
    return;
  }

  try {
    const booking = await createBooking(result.data);
    res.status(201).json({ data: booking });
  } catch (err: any) {
    console.error('POST /api/bookings error:', err);
    if (err.code === 'P2003') {
      res.status(400).json({ error: 'Invalid property ID' });
      return;
    }
    res.status(500).json({ error: 'Failed to create booking' });
  }
});

// ============================================================
// PUT /api/bookings/:id — Update booking
// ============================================================

router.put('/:id', async (req: Request, res: Response) => {
  const result = updateSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({
      error: 'Validation failed',
      details: result.error.flatten().fieldErrors,
    });
    return;
  }

  try {
    const booking = await updateBooking(req.params.id, result.data);
    res.json({ data: booking });
  } catch (err: any) {
    console.error(`PUT /api/bookings/${req.params.id} error:`, err);
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to update booking' });
  }
});

// ============================================================
// DELETE /api/bookings/:id — Soft delete (cancel)
// ============================================================

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const booking = await deleteBooking(req.params.id);
    res.json({ data: booking, message: 'Booking cancelled' });
  } catch (err: any) {
    console.error(`DELETE /api/bookings/${req.params.id} error:`, err);
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Booking not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

export default router;
