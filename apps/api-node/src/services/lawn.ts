/**
 * Lawn service — Prisma business logic for lawn jobs.
 */

import { prisma } from '@cc-ops/db';
import type {
  CreateLawnJobInput,
  UpdateLawnJobInput,
  LawnJobFilters,
} from '@cc-ops/shared';

// Fields to include on every job query
const jobInclude = {
  property: { select: { id: true, name: true, address: true, slug: true, zipCode: true } },
  crew: { select: { id: true, name: true, phone: true, hourlyRate: true } },
} as const;

/**
 * List lawn jobs with optional filters.
 */
export async function getLawnJobs(filters?: LawnJobFilters) {
  const where: Record<string, unknown> = {};

  if (filters?.statuses && filters.statuses.length > 0) {
    where.status = { in: filters.statuses };
  }
  if (filters?.propertyId) {
    where.propertyId = filters.propertyId;
  }
  if (filters?.crewId) {
    where.crewId = filters.crewId;
  }
  if (filters?.fromDate || filters?.toDate) {
    where.scheduledDate = {};
    if (filters.fromDate) {
      (where.scheduledDate as Record<string, Date>).gte = new Date(filters.fromDate);
    }
    if (filters.toDate) {
      (where.scheduledDate as Record<string, Date>).lte = new Date(filters.toDate);
    }
  }

  return prisma.lawnJob.findMany({
    where,
    include: jobInclude,
    orderBy: { scheduledDate: 'asc' },
  });
}

/**
 * Fetch a single lawn job by ID.
 */
export async function getLawnJob(id: string) {
  return prisma.lawnJob.findUnique({
    where: { id },
    include: {
      ...jobInclude,
      photos: { orderBy: { sortOrder: 'asc' } },
    },
  });
}

/**
 * Create a new lawn job.
 */
export async function createLawnJob(data: CreateLawnJobInput) {
  
  const prismaData: any = {
    propertyId: data.propertyId,
    crewId: data.crewId ?? null,
    scheduledDate: new Date(data.scheduledDate),
    scheduledTime: data.scheduledTime ?? null,
    serviceType: data.serviceType,
    status: data.status ?? 'PENDING',
    lotSize: data.lotSize ?? null,
    customerCharge: data.customerCharge ?? 0,
    laborCost: data.laborCost ?? 0,
    materialCost: data.materialCost ?? 0,
    notes: data.notes ?? null,
  };

  return prisma.lawnJob.create({
    data: prismaData,
    include: jobInclude,
  });
}

/**
 * Update an existing lawn job.
 */
export async function updateLawnJob(id: string, data: UpdateLawnJobInput) {
  
  const updateInfo: any = {};
  if (data.propertyId !== undefined) updateInfo.propertyId = data.propertyId;
  if (data.crewId !== undefined) updateInfo.crewId = data.crewId;
  if (data.scheduledDate !== undefined) updateInfo.scheduledDate = new Date(data.scheduledDate);
  if (data.scheduledTime !== undefined) updateInfo.scheduledTime = data.scheduledTime;
  if (data.serviceType !== undefined) updateInfo.serviceType = data.serviceType;
  if (data.status !== undefined) updateInfo.status = data.status;
  if (data.lotSize !== undefined) updateInfo.lotSize = data.lotSize;
  if (data.customerCharge !== undefined) updateInfo.customerCharge = data.customerCharge;
  if (data.laborCost !== undefined) updateInfo.laborCost = data.laborCost;
  if (data.materialCost !== undefined) updateInfo.materialCost = data.materialCost;
  if (data.notes !== undefined) updateInfo.notes = data.notes;

  return prisma.lawnJob.update({
    where: { id },
    data: updateInfo,
    include: jobInclude,
  });
}

/**
 * Cancel (soft-delete) a lawn job by setting status to CANCELLED.
 */
export async function deleteLawnJob(id: string) {
  return prisma.lawnJob.update({
    where: { id },
    data: { status: 'CANCELLED' },
    include: jobInclude,
  });
}

/**
 * Attach a photo to a lawn job.
 */
export async function addLawnPhoto(
  jobId: string,
  data: { url: string; category?: string | null; sortOrder?: number }
) {
  return prisma.lawnPhoto.create({
    data: {
      jobId,
      url: data.url,
      photoType: (data.category ?? 'AFTER') as import('@cc-ops/db').LawnPhotoType,
      sortOrder: data.sortOrder ?? 0,
    },
  });
}

/**
 * List all lawn crews.
 */
export async function getLawnCrews() {
  return prisma.lawnCrew.findMany({
    orderBy: { name: 'asc' },
  });
}
