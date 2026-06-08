/**
 * Property service layer — Prisma business logic for property CRUD.
 */

import { PrismaClient, PropertyStatus } from '@cc-ops/db';
import type {
  CreatePropertyInput,
  UpdatePropertyInput,
  PropertyListItem,
} from '@cc-ops/shared';

const prisma = new PrismaClient();

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
}

async function uniqueSlug(name: string, excludeId?: string): Promise<string> {
  const base = generateSlug(name);
  let slug = base;
  let counter = 1;

  while (true) {
    const existing = await prisma.property.findUnique({ where: { slug } });
    if (!existing || (excludeId && existing.id === excludeId)) return slug;
    slug = `${base}-${counter++}`;
  }
}

// ============================================================
// List — all properties with summary stats
// ============================================================

export async function getProperties(): Promise<PropertyListItem[]> {
  const properties = await prisma.property.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      photos: { select: { id: true } },
      bookings: {
        where: {
          status: { in: ['CONFIRMED', 'ACTIVE'] },
        },
        select: { id: true, checkIn: true, checkOut: true, totalAmount: true },
      },
    },
  });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  return properties.map((p) => {
    // Count active bookings (currently occupied or upcoming)
    const activeBookingCount = p.bookings.filter(
      (b) => new Date(b.checkOut) >= now
    ).length;

    // Calculate MTD revenue from completed bookings
    const revenueThisMonth = p.bookings
      .filter((b) => new Date(b.checkIn) >= monthStart)
      .reduce((sum, b) => sum + Number(b.totalAmount), 0);

    // Simple occupancy: days booked this month / days in month
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const bookedDays = new Set<number>();
    for (const b of p.bookings) {
      const ci = new Date(b.checkIn);
      const co = new Date(b.checkOut);
      for (let d = new Date(ci); d < co; d.setDate(d.getDate() + 1)) {
        if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) {
          bookedDays.add(d.getDate());
        }
      }
    }
    const occupancyThisMonth = Math.round((bookedDays.size / daysInMonth) * 100);

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      address: p.address,
      city: p.city,
      state: p.state,
      zipCode: p.zipCode,
      type: p.type as PropertyListItem['type'],
      bedrooms: p.bedrooms,
      bathrooms: Number(p.bathrooms),
      maxGuests: p.maxGuests,
      baseRate: Number(p.baseRate),
      status: p.status as PropertyListItem['status'],
      isPetFriendly: p.isPetFriendly,
      hasPool: p.hasPool,
      isBeachfront: p.isBeachfront,
      photoCount: p.photos.length,
      occupancyThisMonth,
      revenueThisMonth,
      activeBookingCount,
    };
  });
}

// ============================================================
// Detail — single property with all relations
// ============================================================

export async function getProperty(id: string) {
  const property = await prisma.property.findUnique({
    where: { id },
    include: {
      photos: { orderBy: { sortOrder: 'asc' } },
      bookings: {
        orderBy: { checkIn: 'desc' },
        take: 20,
      },
      expenses: {
        orderBy: { date: 'desc' },
        take: 50,
      },
      pricingRules: {
        where: { isActive: true },
        orderBy: { priority: 'desc' },
      },
      cleaningJobs: {
        orderBy: { scheduledStart: 'desc' },
        take: 10,
        include: { cleaner: { select: { name: true } } },
      },
      lawnJobs: {
        orderBy: { scheduledDate: 'desc' },
        take: 10,
        include: { crew: { select: { name: true } } },
      },
    },
  });

  return property;
}

// ============================================================
// Create
// ============================================================

export async function createProperty(data: CreatePropertyInput) {
  const slug = await uniqueSlug(data.name);

  return prisma.property.create({
    data: {
      name: data.name,
      slug,
      address: data.address,
      zipCode: data.zipCode,
      city: data.city ?? 'Corpus Christi',
      state: data.state ?? 'TX',
      latitude: data.latitude,
      longitude: data.longitude,
      type: data.type ?? 'HOUSE',
      bedrooms: data.bedrooms,
      bathrooms: data.bathrooms,
      maxGuests: data.maxGuests,
      squareFeet: data.squareFeet,
      lotSizeSqFt: data.lotSizeSqFt,
      yearBuilt: data.yearBuilt,
      description: data.description,
      amenities: data.amenities ?? [],
      baseRate: data.baseRate,
      cleaningFee: data.cleaningFee ?? 0,
      petFee: data.petFee ?? 0,
      isPetFriendly: data.isPetFriendly ?? false,
      hasPool: data.hasPool ?? false,
      hasHotTub: data.hasHotTub ?? false,
      isBeachfront: data.isBeachfront ?? false,
      status: data.status ?? 'ACTIVE',
      listingUrlAirbnb: data.listingUrlAirbnb,
      listingUrlVrbo: data.listingUrlVrbo,
    },
  });
}

// ============================================================
// Update
// ============================================================

export async function updateProperty(id: string, data: UpdatePropertyInput) {
  // Regenerate slug if name changed
  let slug: string | undefined;
  if (data.name) {
    slug = await uniqueSlug(data.name, id);
  }

  return prisma.property.update({
    where: { id },
    data: {
      ...(data.name && { name: data.name }),
      ...(slug && { slug }),
      ...(data.address && { address: data.address }),
      ...(data.zipCode && { zipCode: data.zipCode }),
      ...(data.city && { city: data.city }),
      ...(data.state && { state: data.state }),
      ...(data.latitude !== undefined && { latitude: data.latitude }),
      ...(data.longitude !== undefined && { longitude: data.longitude }),
      ...(data.type && { type: data.type }),
      ...(data.bedrooms !== undefined && { bedrooms: data.bedrooms }),
      ...(data.bathrooms !== undefined && { bathrooms: data.bathrooms }),
      ...(data.maxGuests !== undefined && { maxGuests: data.maxGuests }),
      ...(data.squareFeet !== undefined && { squareFeet: data.squareFeet }),
      ...(data.lotSizeSqFt !== undefined && { lotSizeSqFt: data.lotSizeSqFt }),
      ...(data.yearBuilt !== undefined && { yearBuilt: data.yearBuilt }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.amenities && { amenities: data.amenities }),
      ...(data.baseRate !== undefined && { baseRate: data.baseRate }),
      ...(data.cleaningFee !== undefined && { cleaningFee: data.cleaningFee }),
      ...(data.petFee !== undefined && { petFee: data.petFee }),
      ...(data.isPetFriendly !== undefined && { isPetFriendly: data.isPetFriendly }),
      ...(data.hasPool !== undefined && { hasPool: data.hasPool }),
      ...(data.hasHotTub !== undefined && { hasHotTub: data.hasHotTub }),
      ...(data.isBeachfront !== undefined && { isBeachfront: data.isBeachfront }),
      ...(data.status && { status: data.status }),
      ...(data.listingUrlAirbnb !== undefined && { listingUrlAirbnb: data.listingUrlAirbnb }),
      ...(data.listingUrlVrbo !== undefined && { listingUrlVrbo: data.listingUrlVrbo }),
    },
  });
}

// ============================================================
// Delete (soft — set status to INACTIVE)
// ============================================================

export async function deleteProperty(id: string) {
  return prisma.property.update({
    where: { id },
    data: { status: PropertyStatus.INACTIVE },
  });
}
