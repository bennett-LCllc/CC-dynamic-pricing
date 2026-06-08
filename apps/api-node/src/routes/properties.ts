/**
 * Property routes — Express router for /api/properties
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  getProperties,
  getProperty,
  createProperty,
  updateProperty,
  deleteProperty,
} from '../services/properties';

const router = Router();

// ============================================================
// Validation schemas
// ============================================================

const createSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  address: z.string().min(1, 'Address is required').max(500),
  zipCode: z.string().min(5, 'ZIP code is required').max(10),
  type: z.enum(['HOUSE', 'CONDO', 'TOWNHOUSE', 'DUPLEX', 'TRIPLEX', 'APARTMENT', 'CABIN']).optional(),
  bedrooms: z.number().int().min(0).max(20),
  bathrooms: z.number().min(0).max(20),
  maxGuests: z.number().int().min(1).max(50),
  city: z.string().optional(),
  state: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  squareFeet: z.number().int().positive().optional(),
  lotSizeSqFt: z.number().int().positive().optional(),
  yearBuilt: z.number().int().min(1800).max(2100).optional(),
  description: z.string().max(5000).optional(),
  amenities: z.array(z.string()).optional(),
  baseRate: z.number().positive('Base rate must be positive'),
  cleaningFee: z.number().min(0).optional(),
  petFee: z.number().min(0).optional(),
  isPetFriendly: z.boolean().optional(),
  hasPool: z.boolean().optional(),
  hasHotTub: z.boolean().optional(),
  isBeachfront: z.boolean().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'UNDER_RENOVATION', 'SOLD']).optional(),
  listingUrlAirbnb: z.string().url().optional().or(z.literal('')),
  listingUrlVrbo: z.string().url().optional().or(z.literal('')),
});

const updateSchema = createSchema.partial();

// ============================================================
// GET /api/properties — List all properties
// ============================================================

router.get('/', async (_req: Request, res: Response) => {
  try {
    const properties = await getProperties();
    res.json({ data: properties });
  } catch (err) {
    console.error('GET /api/properties error:', err);
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
});

// ============================================================
// GET /api/properties/:id — Get single property
// ============================================================

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const property = await getProperty(req.params.id);
    if (!property) {
      res.status(404).json({ error: 'Property not found' });
      return;
    }
    res.json({ data: property });
  } catch (err) {
    console.error(`GET /api/properties/${req.params.id} error:`, err);
    res.status(500).json({ error: 'Failed to fetch property' });
  }
});

// ============================================================
// POST /api/properties — Create property
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
    const property = await createProperty(result.data);
    res.status(201).json({ data: property });
  } catch (err: any) {
    console.error('POST /api/properties error:', err);
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'A property with this slug already exists' });
      return;
    }
    res.status(500).json({ error: 'Failed to create property' });
  }
});

// ============================================================
// PUT /api/properties/:id — Update property
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
    const property = await updateProperty(req.params.id, result.data);
    res.json({ data: property });
  } catch (err: any) {
    console.error(`PUT /api/properties/${req.params.id} error:`, err);
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Property not found' });
      return;
    }
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'A property with this slug already exists' });
      return;
    }
    res.status(500).json({ error: 'Failed to update property' });
  }
});

// ============================================================
// DELETE /api/properties/:id — Soft delete (set INACTIVE)
// ============================================================

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const property = await deleteProperty(req.params.id);
    res.json({ data: property, message: 'Property set to INACTIVE' });
  } catch (err: any) {
    console.error(`DELETE /api/properties/${req.params.id} error:`, err);
    if (err.code === 'P2025') {
      res.status(404).json({ error: 'Property not found' });
      return;
    }
    res.status(500).json({ error: 'Failed to delete property' });
  }
});

export default router;
