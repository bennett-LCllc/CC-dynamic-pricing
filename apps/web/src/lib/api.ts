/**
 * API client for the pricing engine and data.
 * In production, this hits your FastAPI backend and your Node.js API.
 */

const PRICING_API_URL = process.env.NEXT_PUBLIC_PRICING_API_URL || 'http://localhost:8000';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

import type {
  PropertyListItem,
  Property,
  CreatePropertyInput,
  UpdatePropertyInput,
} from '@cc-ops/shared';

export async function calculateRate(params: {
  base_rate: number;
  target_date: string;
  property_type?: string;
  bedrooms?: number;
  upcoming_occupancy_rate?: number;
}) {
  const res = await fetch(`${PRICING_API_URL}/api/pricing/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`Pricing API error: ${res.status}`);
  return res.json();
}

export async function getForecast(params: {
  base_rate: number;
  property_type?: string;
  bedrooms?: number;
  days?: number;
  existing_bookings?: Array<{ check_in: string; check_out: string }>;
}) {
  const res = await fetch(`${PRICING_API_URL}/api/pricing/forecast`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`Pricing API error: ${res.status}`);
  return res.json();
}

export async function getSeasonalMultipliers() {
  const res = await fetch(`${PRICING_API_URL}/api/pricing/seasonal-multipliers`);
  if (!res.ok) throw new Error(`Pricing API error: ${res.status}`);
  return res.json();
}

export async function getEvents() {
  const res = await fetch(`${PRICING_API_URL}/api/pricing/events`);
  if (!res.ok) throw new Error(`Pricing API error: ${res.status}`);
  return res.json();
}

// ============================================================
// Properties CRUD
// ============================================================

export async function getProperties(): Promise<PropertyListItem[]> {
  const res = await fetch(`${API_URL}/api/properties`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  return json.data;
}

export async function getProperty(id: string): Promise<Property> {
  const res = await fetch(`${API_URL}/api/properties/${id}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  return json.data;
}

export async function createProperty(data: CreatePropertyInput): Promise<Property> {
  const res = await fetch(`${API_URL}/api/properties`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `API error: ${res.status}`);
  }
  const json = await res.json();
  return json.data;
}

export async function updateProperty(id: string, data: UpdatePropertyInput): Promise<Property> {
  const res = await fetch(`${API_URL}/api/properties/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `API error: ${res.status}`);
  }
  const json = await res.json();
  return json.data;
}

export async function deleteProperty(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/properties/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
}

// ============================================================
// Dashboard
// ============================================================

export interface DashboardData {
  properties: {
    total: number;
    active: number;
    inactive: number;
    occupancyRate: number;
  };
  today: {
    checkIns: number;
    checkOuts: number;
    cleaningScheduled: number;
    cleaningCompleted: number;
    lawnScheduled: number;
    lawnCompleted: number;
  };
  revenue: {
    mtd: number;
    projectedMonthly: number;
  };
  upcomingBookings: number;
  llcs: {
    str: { units: string; mtdRevenue: number; occupancy: string };
    lawn: { clients: string; mtdRevenue: number; jobsToday: number };
    cleaning: { clients: string; mtdRevenue: number; turnoversToday: number };
  };
  expenses: {
    str: number;
    lawn: number;
    cleaning: number;
  };
  recentActivity: {
    bookings: Array<{
      id: string;
      type: string;
      title: string;
      property: string;
      date: string;
      status: string;
      amount: number;
    }>;
    cleaningJobs: Array<{
      id: string;
      type: string;
      title: string;
      property: string;
      date: string;
      status: string;
    }>;
  };
  alerts: Array<{
    id: string;
    type: 'info' | 'warning' | 'critical';
    title: string;
    description: string;
    propertyName?: string;
  }>;
}

export async function getDashboardOverview(): Promise<DashboardData> {
  const res = await fetch(`${API_URL}/api/dashboard/overview`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  return json.data;
}
