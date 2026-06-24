/**
 * Financials service — Prisma business logic for financial dashboard.
 */

import { prisma } from '@cc-ops/db';
import type {
  CreateExpenseInput,
  UpdateExpenseInput,
  ExpenseFilters,
  FinancialOverview,
  ExpenseBreakdown,
} from '@cc-ops/shared';

// ─── Expense CRUD ───────────────────────────────────────────────

/**
 * List expenses with optional filters.
 */
export async function getExpenses(filters?: ExpenseFilters) {
  const where: Record<string, unknown> = {};

  if (filters?.propertyId) {
    where.propertyId = filters.propertyId;
  }
  if (filters?.category) {
    where.category = filters.category;
  }
  if (filters?.incurredBy) {
    where.incurredBy = filters.incurredBy;
  }
  if (filters?.fromDate || filters?.toDate) {
    where.date = {};
    if (filters.fromDate) {
      (where.date as Record<string, Date>).gte = new Date(filters.fromDate);
    }
    if (filters.toDate) {
      (where.date as Record<string, Date>).lte = new Date(filters.toDate);
    }
  }

  return prisma.expense.findMany({
    where,
    include: {
      property: { select: { id: true, name: true } },
    },
    orderBy: { date: 'desc' },
  });
}

/**
 * Create a new expense.
 */
export async function createExpense(data: CreateExpenseInput) {
  return prisma.expense.create({
    data: {
      propertyId: data.propertyId ?? null,
      category: data.category as never,
      description: data.description,
      amount: data.amount,
      date: new Date(data.date),
      incurredBy: (data.incurredBy ?? 'STR') as never,
      paidFrom: data.paidFrom ?? null,
      receiptUrl: data.receiptUrl ?? null,
      vendor: data.vendor ?? null,
      isRecurring: data.isRecurring ?? false,
      recurringInterval: (data.recurringInterval ?? null) as never,
      notes: data.notes ?? null,
    },
    include: {
      property: { select: { id: true, name: true } },
    },
  });
}

/**
 * Update an existing expense.
 */
export async function updateExpense(id: string, data: UpdateExpenseInput) {
  const updateData: Record<string, unknown> = {};
  if (data.propertyId !== undefined) updateData.propertyId = data.propertyId;
  if (data.category !== undefined) updateData.category = data.category;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.amount !== undefined) updateData.amount = data.amount;
  if (data.date !== undefined) updateData.date = new Date(data.date);
  if (data.incurredBy !== undefined) updateData.incurredBy = data.incurredBy;
  if (data.paidFrom !== undefined) updateData.paidFrom = data.paidFrom;
  if (data.receiptUrl !== undefined) updateData.receiptUrl = data.receiptUrl;
  if (data.vendor !== undefined) updateData.vendor = data.vendor;
  if (data.isRecurring !== undefined) updateData.isRecurring = data.isRecurring;
  if (data.recurringInterval !== undefined) updateData.recurringInterval = data.recurringInterval;
  if (data.notes !== undefined) updateData.notes = data.notes;

  return prisma.expense.update({
    where: { id },
    data: updateData as never,
    include: {
      property: { select: { id: true, name: true } },
    },
  });
}

/**
 * Delete an expense.
 */
export async function deleteExpense(id: string) {
  return prisma.expense.delete({
    where: { id },
  });
}

// ─── Financial Overview ─────────────────────────────────────────

/**
 * Get the current month's date range.
 */
function getCurrentMonthRange() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  return { monthStart, monthEnd, now };
}

/**
 * Calculate revenue for a given source within a date range.
 */
async function calculateRevenue(
  source: 'str' | 'lawn' | 'cleaning',
  from: Date,
  to: Date
): Promise<number> {
  if (source === 'str') {
    const bookings = await prisma.booking.findMany({
      where: {
        checkOut: { gte: from, lte: to },
        status: { notIn: ['CANCELLED', 'NO_SHOW'] },
      },
      select: { totalAmount: true },
    });
    return bookings.reduce((sum, b) => sum + Number(b.totalAmount), 0);
  }

  if (source === 'lawn') {
    const jobs = await prisma.lawnJob.findMany({
      where: {
        scheduledDate: { gte: from, lte: to } as never,
        status: 'COMPLETED',
      },
      select: { customerCharge: true },
    });
    return jobs.reduce((sum, j) => sum + Number(j.customerCharge ?? 0), 0);
  }

  // cleaning
  const jobs = await prisma.cleaningJob.findMany({
    where: {
      scheduledStart: { gte: from, lte: to },
      status: 'COMPLETED',
    },
    select: { customerCharge: true },
  });
  return jobs.reduce((sum, j) => sum + Number(j.customerCharge ?? 0), 0);
}

/**
 * Calculate expenses for a given LLC within a date range.
 */
async function calculateExpenses(
  llc: 'STR' | 'LAWN' | 'CLEANING',
  from: Date,
  to: Date
): Promise<number> {
  const expenses = await prisma.expense.findMany({
    where: {
      date: { gte: from, lte: to },
      incurredBy: llc,
    },
    select: { amount: true },
  });
  return expenses.reduce((sum, e) => sum + Number(e.amount), 0);
}

/**
 * Get expense breakdown by category for the current month.
 */
async function getExpenseBreakdown(
  from: Date,
  to: Date
): Promise<ExpenseBreakdown[]> {
  const expenses = await prisma.expense.findMany({
    where: { date: { gte: from, lte: to } },
    select: { category: true, amount: true },
  });

  const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0);
  if (total === 0) return [];

  // Aggregate by category
  const byCategory: Record<string, number> = {};
  for (const e of expenses) {
    byCategory[e.category] = (byCategory[e.category] ?? 0) + Number(e.amount);
  }

  return Object.entries(byCategory)
    .map(([category, amount]) => ({
      category: category.replace(/_/g, ' '),
      amount,
      percentage: Math.round((amount / total) * 1000) / 10,
      trend: 'stable' as const,
    }))
    .sort((a, b) => b.amount - a.amount);
}

/**
 * Consolidated financial overview for the current month.
 */
export async function getFinancialOverview(): Promise<FinancialOverview> {
  const { monthStart, monthEnd } = getCurrentMonthRange();
  const period = monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  // Fetch all revenue and expenses in parallel
  const [strRevenue, lawnRevenue, cleaningRevenue, strExpenses, lawnExpenses, cleaningExpenses, expenseBreakdown] =
    await Promise.all([
      calculateRevenue('str', monthStart, monthEnd),
      calculateRevenue('lawn', monthStart, monthEnd),
      calculateRevenue('cleaning', monthStart, monthEnd),
      calculateExpenses('STR', monthStart, monthEnd),
      calculateExpenses('LAWN', monthStart, monthEnd),
      calculateExpenses('CLEANING', monthStart, monthEnd),
      getExpenseBreakdown(monthStart, monthEnd),
    ]);

  const consolidatedRevenue = strRevenue + lawnRevenue + cleaningRevenue;
  const consolidatedExpenses = strExpenses + lawnExpenses + cleaningExpenses;

  return {
    period,
    llcs: {
      str: {
        revenue: strRevenue,
        expenses: strExpenses,
        netIncome: strRevenue - strExpenses,
      },
      lawn: {
        revenue: lawnRevenue,
        expenses: lawnExpenses,
        netIncome: lawnRevenue - lawnExpenses,
      },
      cleaning: {
        revenue: cleaningRevenue,
        expenses: cleaningExpenses,
        netIncome: cleaningRevenue - cleaningExpenses,
      },
    },
    consolidated: {
      revenue: consolidatedRevenue,
      expenses: consolidatedExpenses,
      netIncome: consolidatedRevenue - consolidatedExpenses,
    },
    expenseBreakdown,
  };
}

/**
 * Per-LLC financial breakdown.
 */
export async function getLLCFinancials(llc: 'STR' | 'LAWN' | 'CLEANING'): Promise<FinancialOverview['llcs']['str']> {
  const { monthStart, monthEnd } = getCurrentMonthRange();

  const sourceMap = { STR: 'str' as const, LAWN: 'lawn' as const, CLEANING: 'cleaning' as const };
  const source = sourceMap[llc];

  const [revenue, expenses] = await Promise.all([
    calculateRevenue(source, monthStart, monthEnd),
    calculateExpenses(llc, monthStart, monthEnd),
  ]);

  return {
    revenue,
    expenses,
    netIncome: revenue - expenses,
  };
}
