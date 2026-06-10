/**
 * Customer service — Prisma business logic for external customer management.
 */

import { prisma } from '@cc-ops/db';
import type {
  CreateCustomerInput,
  UpdateCustomerInput,
  CustomerFilters,
} from '@cc-ops/shared';

/**
 * List customers with optional search and filters.
 */
export async function getCustomers(filters?: CustomerFilters) {
  const where: Record<string, unknown> = {};

  // Search by name or email
  if (filters?.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { email: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  if (filters?.type) {
    where.type = filters.type;
  }

  if (filters?.status) {
    where.status = filters.status;
  }

  return prisma.customer.findMany({
    where,
    include: {
      properties: {
        where: { isActive: true },
        select: { id: true, name: true, address: true, zipCode: true },
      },
      _count: {
        select: {
          properties: true,
          lawnJobs: true,
          cleaningJobs: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });
}

/**
 * Fetch a single customer by ID with full relations.
 */
export async function getCustomer(id: string) {
  return prisma.customer.findUnique({
    where: { id },
    include: {
      properties: {
        orderBy: { createdAt: 'asc' },
      },
      lawnJobs: {
        orderBy: { scheduledDate: 'desc' },
        take: 20,
      },
      cleaningJobs: {
        orderBy: { scheduledStart: 'desc' },
        take: 20,
      },
    },
  });
}

/**
 * Create a new customer.
 */
export async function createCustomer(data: CreateCustomerInput) {
  return prisma.customer.create({
    data: {
      name: data.name,
      email: data.email ?? null,
      phone: data.phone,
      company: data.company ?? null,
      type: data.type ?? 'RESIDENTIAL',
      status: data.status ?? 'ACTIVE',
      stripeCustomerId: data.stripeCustomerId ?? null,
      notes: data.notes ?? null,
    },
    include: {
      properties: true,
      _count: {
        select: {
          properties: true,
          lawnJobs: true,
          cleaningJobs: true,
        },
      },
    },
  });
}

/**
 * Update an existing customer.
 */
export async function updateCustomer(id: string, data: UpdateCustomerInput) {
  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.email !== undefined) updateData.email = data.email;
  if (data.phone !== undefined) updateData.phone = data.phone;
  if (data.company !== undefined) updateData.company = data.company;
  if (data.type !== undefined) updateData.type = data.type;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.stripeCustomerId !== undefined) updateData.stripeCustomerId = data.stripeCustomerId;
  if (data.notes !== undefined) updateData.notes = data.notes;

  return prisma.customer.update({
    where: { id },
    data: updateData,
    include: {
      properties: true,
      _count: {
        select: {
          properties: true,
          lawnJobs: true,
          cleaningJobs: true,
        },
      },
    },
  });
}

/**
 * Deactivate a customer (soft delete — set status to INACTIVE).
 */
export async function deleteCustomer(id: string) {
  return prisma.customer.update({
    where: { id },
    data: { status: 'INACTIVE' },
  });
}
