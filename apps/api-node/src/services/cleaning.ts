/**
 * Cleaning service — Prisma business logic for cleaning jobs.
 */

import { prisma } from '@cc-ops/db';
import type {
  CreateCleaningJobInput,
  UpdateCleaningJobInput,
  CleaningJobFilters,
} from '@cc-ops/shared';

// Fields to include on every job query
const jobInclude = {
  property: { select: { id: true, name: true, address: true, slug: true, zipCode: true } },
  cleaner: { select: { id: true, name: true, phone: true } },
  booking: { select: { id: true, guestName: true, checkIn: true, checkOut: true } },
  checklist: true,
} as const;

/**
 * List cleaning jobs with optional filters.
 */
export async function getCleaningJobs(filters?: CleaningJobFilters) {
  const where: Record<string, unknown> = {};

  if (filters?.statuses && filters.statuses.length > 0) {
    where.status = { in: filters.statuses };
  }
  if (filters?.propertyId) {
    where.propertyId = filters.propertyId;
  }
  if (filters?.cleanerId) {
    where.cleanerId = filters.cleanerId;
  }
  if (filters?.fromDate || filters?.toDate) {
    where.scheduledStart = {};
    if (filters.fromDate) {
      (where.scheduledStart as Record<string, Date>).gte = new Date(filters.fromDate);
    }
    if (filters.toDate) {
      (where.scheduledStart as Record<string, Date>).lte = new Date(filters.toDate);
    }
  }

  return prisma.cleaningJob.findMany({
    where,
    include: jobInclude,
    orderBy: { scheduledStart: 'asc' },
  });
}

/**
 * Fetch a single cleaning job by ID.
 */
export async function getCleaningJob(id: string) {
  return prisma.cleaningJob.findUnique({
    where: { id },
    include: {
      ...jobInclude,
      photos: { orderBy: { sortOrder: 'asc' } },
    },
  });
}

/**
 * Create a new cleaning job.
 */
export async function createCleaningJob(data: CreateCleaningJobInput) {
  
  const prismaData: any = {
    propertyId: data.propertyId,
    bookingId: data.bookingId ?? null,
    scheduledStart: new Date(data.scheduledStart),
    scheduledEnd: new Date(data.scheduledEnd),
    cleaningType: data.cleaningType,
    status: data.status ?? 'PENDING',
    cleanerId: data.cleanerId as string,
    bedrooms: data.bedrooms ?? null,
    bathrooms: data.bathrooms ?? null,
    squareFeet: data.squareFeet ?? null,
    customerCharge: data.customerCharge ?? 0,
    laborCost: data.laborCost ?? 0,
    supplyCost: data.supplyCost ?? 0,
    travelCost: data.travelCost ?? 0,
    notes: data.notes ?? null,
  };

  return prisma.cleaningJob.create({
    data: prismaData,
    include: jobInclude,
  });
}

/**
 * Update an existing cleaning job.
 */
export async function updateCleaningJob(id: string, data: UpdateCleaningJobInput) {
  
  const updateInfo: any = {};
  if (data.propertyId !== undefined) updateInfo.propertyId = data.propertyId;
  if (data.bookingId !== undefined) updateInfo.bookingId = data.bookingId;
  if (data.scheduledStart !== undefined) updateInfo.scheduledStart = new Date(data.scheduledStart);
  if (data.scheduledEnd !== undefined) updateInfo.scheduledEnd = new Date(data.scheduledEnd);
  if (data.cleaningType !== undefined) updateInfo.cleaningType = data.cleaningType;
  if (data.status !== undefined) updateInfo.status = data.status;
  if (data.cleanerId !== undefined) updateInfo.cleanerId = data.cleanerId;
  if (data.bedrooms !== undefined) updateInfo.bedrooms = data.bedrooms;
  if (data.bathrooms !== undefined) updateInfo.bathrooms = data.bathrooms;
  if (data.squareFeet !== undefined) updateInfo.squareFeet = data.squareFeet;
  if (data.customerCharge !== undefined) updateInfo.customerCharge = data.customerCharge;
  if (data.laborCost !== undefined) updateInfo.laborCost = data.laborCost;
  if (data.supplyCost !== undefined) updateInfo.supplyCost = data.supplyCost;
  if (data.travelCost !== undefined) updateInfo.travelCost = data.travelCost;
  if (data.notes !== undefined) updateInfo.notes = data.notes;

  return prisma.cleaningJob.update({
    where: { id },
    data: updateInfo,
    include: jobInclude,
  });
}

/**
 * Cancel (soft-delete) a cleaning job by setting status to CANCELLED.
 */
export async function deleteCleaningJob(id: string) {
  return prisma.cleaningJob.update({
    where: { id },
    data: { status: 'CANCELLED' },
    include: jobInclude,
  });
}

/**
 * Submit a checklist for a cleaning job.
 * Upsert: creates if not exists, replaces if it does.
 */
export async function submitChecklist(jobId: string, tasks: Record<string, boolean>) {
  return prisma.cleaningChecklist.upsert({
    where: { jobId },
    create: { jobId, tasks },
    update: { tasks, completedAt: new Date() },
  });
}

/**
 * Attach a photo to a cleaning job.
 */
export async function addCleaningPhoto(
  jobId: string,
  data: { url: string; category?: string | null; sortOrder?: number }
) {
  return prisma.cleaningPhoto.create({
    data: {
      jobId,
      url: data.url,
      category: (data.category ?? 'OTHER') as import('@cc-ops/db').PhotoCategory,
      sortOrder: data.sortOrder ?? 0,
    },
  });
}

/**
 * List all active cleaners.
 */
export async function getCleaners() {
  return prisma.cleaner.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });
}
