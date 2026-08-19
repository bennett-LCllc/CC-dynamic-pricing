/**
 * API client for the pricing engine and data.
 * In production, this hits your FastAPI backend and your Node.js API.
 */

const PRICING_API_URL = process.env.NEXT_PUBLIC_PRICING_API_URL || 'http://localhost:8000';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

import type {
  AuthLoginInput,
  AuthRegisterInput,
  AuthResponse,
  Booking,
  Cleaner,
  CleaningChecklist,
  CleaningJob,
  CleaningJobFilters,
  CleaningJobSummary,
  CreateBookingInput,
  CreateCleaningJobInput,
  CreateCustomerInput,
  CreateExpenseInput,
  CreateLawnJobInput,
  CreateMessageInput,
  CreateMessageTemplateInput,
  CreatePropertyInput,
  Customer,
  CustomerFilters,
  CustomerSummary,
  Expense,
  ExpenseFilters,
  FinancialOverview,
  GuestMessage,
  LawnCrew,
  LawnJob,
  LawnJobFilters,
  MessageFilters,
  MessageTemplate,
  Property,
  PropertyListItem,
  SettingEntry,
  SettingsMap,
  UpdateBookingInput,
  UpdateCleaningJobInput,
  UpdateCustomerInput,
  UpdateExpenseInput,
  UpdateLawnJobInput,
  UpdateMessageTemplateInput,
  UpdatePropertyInput,
  UpdateUserInput,
  User,
} from '@cc-ops/shared';

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('cc-ops-token');
}

async function authFetch(url: string, init?: RequestInit): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(init?.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(url, { ...init, headers });
}

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

// ============================================================
// Bookings CRUD
// ============================================================

export async function getBookings(params?: {
  propertyId?: string;
  status?: string;
  from?: string;
  to?: string;
}): Promise<Booking[]> {
  const sp = new URLSearchParams();
  if (params?.propertyId) sp.set('propertyId', params.propertyId);
  if (params?.status) sp.set('status', params.status);
  if (params?.from) sp.set('from', params.from);
  if (params?.to) sp.set('to', params.to);
  const qs = sp.toString();
  const res = await fetch(`${API_URL}/api/bookings${qs ? '?' + qs : ''}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  return json.data;
}

export async function getBookingsCalendar(params: {
  from: string;
  to: string;
  propertyId?: string;
}): Promise<Booking[]> {
  const sp = new URLSearchParams({ from: params.from, to: params.to });
  if (params.propertyId) sp.set('propertyId', params.propertyId);
  const res = await fetch(`${API_URL}/api/bookings/calendar?${sp}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  return json.data;
}

export async function getBooking(id: string): Promise<Booking> {
  const res = await fetch(`${API_URL}/api/bookings/${id}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  return json.data;
}

export async function createBooking(data: CreateBookingInput): Promise<Booking> {
  const res = await fetch(`${API_URL}/api/bookings`, {
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

export async function updateBooking(id: string, data: UpdateBookingInput): Promise<Booking> {
  const res = await fetch(`${API_URL}/api/bookings/${id}`, {
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

export async function deleteBooking(id: string): Promise<Booking> {
  const res = await fetch(`${API_URL}/api/bookings/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  return json.data;
}

// ============================================================
// Cleaning CRUD
// ============================================================

export async function getCleaningJobs(filters?: CleaningJobFilters): Promise<CleaningJobSummary[]> {
  const sp = new URLSearchParams();
  if (filters?.statuses?.length) sp.set('statuses', filters.statuses.join(','));
  if (filters?.propertyId) sp.set('propertyId', filters.propertyId);
  if (filters?.cleanerId) sp.set('cleanerId', filters.cleanerId);
  if (filters?.fromDate) sp.set('fromDate', filters.fromDate);
  if (filters?.toDate) sp.set('toDate', filters.toDate);
  const qs = sp.toString();
  const res = await fetch(`${API_URL}/api/cleaning/jobs${qs ? '?' + qs : ''}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  return json.data;
}

export async function getCleaningJob(id: string): Promise<CleaningJob> {
  const res = await fetch(`${API_URL}/api/cleaning/jobs/${id}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  return json.data;
}

export async function createCleaningJob(data: CreateCleaningJobInput): Promise<CleaningJob> {
  const res = await fetch(`${API_URL}/api/cleaning/jobs`, {
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

export async function updateCleaningJob(
  id: string,
  data: UpdateCleaningJobInput,
): Promise<CleaningJob> {
  const res = await fetch(`${API_URL}/api/cleaning/jobs/${id}`, {
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

export async function deleteCleaningJob(id: string): Promise<CleaningJob> {
  const res = await fetch(`${API_URL}/api/cleaning/jobs/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  return json.data;
}

export async function submitCleaningChecklist(
  jobId: string,
  tasks: Record<string, boolean>,
): Promise<CleaningChecklist> {
  const res = await fetch(`${API_URL}/api/cleaning/jobs/${jobId}/checklist`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tasks),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `API error: ${res.status}`);
  }
  const json = await res.json();
  return json.data;
}

export async function addCleaningPhoto(
  jobId: string,
  data: { url: string; category?: string; sortOrder?: number },
) {
  const res = await fetch(`${API_URL}/api/cleaning/jobs/${jobId}/photos`, {
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

export async function getCleaners(): Promise<Cleaner[]> {
  const res = await fetch(`${API_URL}/api/cleaning/cleaners`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  return json.data;
}

// ============================================================
// Lawn CRUD
// ============================================================

export async function getLawnJobs(filters?: LawnJobFilters): Promise<LawnJob[]> {
  const sp = new URLSearchParams();
  if (filters?.statuses?.length) sp.set('statuses', filters.statuses.join(','));
  if (filters?.propertyId) sp.set('propertyId', filters.propertyId);
  if (filters?.crewId) sp.set('crewId', filters.crewId);
  if (filters?.fromDate) sp.set('fromDate', filters.fromDate);
  if (filters?.toDate) sp.set('toDate', filters.toDate);
  const qs = sp.toString();
  const res = await fetch(`${API_URL}/api/lawn/jobs${qs ? '?' + qs : ''}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  return json.data;
}

export async function getLawnJob(id: string): Promise<LawnJob> {
  const res = await fetch(`${API_URL}/api/lawn/jobs/${id}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  return json.data;
}

export async function createLawnJob(data: CreateLawnJobInput): Promise<LawnJob> {
  const res = await fetch(`${API_URL}/api/lawn/jobs`, {
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

export async function updateLawnJob(id: string, data: UpdateLawnJobInput): Promise<LawnJob> {
  const res = await fetch(`${API_URL}/api/lawn/jobs/${id}`, {
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

export async function deleteLawnJob(id: string): Promise<LawnJob> {
  const res = await fetch(`${API_URL}/api/lawn/jobs/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  return json.data;
}

export async function getLawnCrews(): Promise<LawnCrew[]> {
  const res = await fetch(`${API_URL}/api/lawn/crews`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  return json.data;
}

// ============================================================
// Financials
// ============================================================

export async function getFinancialOverview(): Promise<FinancialOverview> {
  const res = await fetch(`${API_URL}/api/financials/overview`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  return json.data;
}

export async function getLLCFinancials(
  type: 'STR' | 'LAWN' | 'CLEANING',
): Promise<{ revenue: number; expenses: number; netIncome: number }> {
  const res = await fetch(`${API_URL}/api/financials/llc/${type}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  return json.data;
}

export async function getExpenses(filters?: ExpenseFilters): Promise<Expense[]> {
  const sp = new URLSearchParams();
  if (filters?.propertyId) sp.set('propertyId', filters.propertyId);
  if (filters?.category) sp.set('category', filters.category);
  if (filters?.incurredBy) sp.set('incurredBy', filters.incurredBy);
  if (filters?.fromDate) sp.set('fromDate', filters.fromDate);
  if (filters?.toDate) sp.set('toDate', filters.toDate);
  const qs = sp.toString();
  const res = await fetch(`${API_URL}/api/financials/expenses${qs ? '?' + qs : ''}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  return json.data;
}

export async function createExpense(data: CreateExpenseInput): Promise<Expense> {
  const res = await fetch(`${API_URL}/api/financials/expenses`, {
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

export async function updateExpense(id: string, data: UpdateExpenseInput): Promise<Expense> {
  const res = await fetch(`${API_URL}/api/financials/expenses/${id}`, {
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

export async function deleteExpense(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/financials/expenses/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
}

// ============================================================
// Messages
// ============================================================

export async function getMessageTemplates(): Promise<MessageTemplate[]> {
  const res = await fetch(`${API_URL}/api/messages/templates`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  return json.data;
}

export async function createMessageTemplate(
  data: CreateMessageTemplateInput,
): Promise<MessageTemplate> {
  const res = await fetch(`${API_URL}/api/messages/templates`, {
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

export async function updateMessageTemplate(
  id: string,
  data: UpdateMessageTemplateInput,
): Promise<MessageTemplate> {
  const res = await fetch(`${API_URL}/api/messages/templates/${id}`, {
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

export async function deleteMessageTemplate(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/messages/templates/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
}

export async function getMessages(filters?: MessageFilters): Promise<GuestMessage[]> {
  const sp = new URLSearchParams();
  if (filters?.bookingId) sp.set('bookingId', filters.bookingId);
  if (filters?.direction) sp.set('direction', filters.direction);
  if (filters?.channel) sp.set('channel', filters.channel);
  if (filters?.automated !== undefined) sp.set('automated', String(filters.automated));
  const qs = sp.toString();
  const res = await fetch(`${API_URL}/api/messages${qs ? '?' + qs : ''}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  return json.data;
}

export async function getBookingMessages(bookingId: string): Promise<GuestMessage[]> {
  const res = await fetch(`${API_URL}/api/messages/booking/${bookingId}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  return json.data;
}

export async function sendMessage(data: CreateMessageInput): Promise<GuestMessage> {
  const res = await fetch(`${API_URL}/api/messages`, {
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

export async function deleteMessage(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/messages/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
}

// ============================================================
// Customers CRUD
// ============================================================

export async function getCustomers(filters?: CustomerFilters): Promise<CustomerSummary[]> {
  const sp = new URLSearchParams();
  if (filters?.search) sp.set('search', filters.search);
  if (filters?.type) sp.set('type', filters.type);
  if (filters?.status) sp.set('status', filters.status);
  const qs = sp.toString();
  const res = await fetch(`${API_URL}/api/customers${qs ? '?' + qs : ''}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  return json.data;
}

export async function getCustomer(id: string): Promise<Customer> {
  const res = await fetch(`${API_URL}/api/customers/${id}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  return json.data;
}

export async function createCustomer(data: CreateCustomerInput): Promise<Customer> {
  const res = await fetch(`${API_URL}/api/customers`, {
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

export async function updateCustomer(id: string, data: UpdateCustomerInput): Promise<Customer> {
  const res = await fetch(`${API_URL}/api/customers/${id}`, {
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

export async function deleteCustomer(id: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/customers/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
}

// ============================================================
// Auth
// ============================================================

export async function login(data: AuthLoginInput): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Login failed' }));
    throw new Error(err.error || `API error: ${res.status}`);
  }
  const json = await res.json();
  return json.data;
}

export async function register(data: AuthRegisterInput): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Registration failed' }));
    throw new Error(err.error || `API error: ${res.status}`);
  }
  const json = await res.json();
  return json.data;
}

export async function getMe(): Promise<User> {
  const res = await authFetch(`${API_URL}/api/auth/me`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  return json.data;
}

export async function getUsers(): Promise<User[]> {
  const res = await authFetch(`${API_URL}/api/auth/users`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  return json.data;
}

export async function updateUser(id: string, data: UpdateUserInput): Promise<User> {
  const res = await authFetch(`${API_URL}/api/auth/users/${id}`, {
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

export async function deleteUserApi(id: string): Promise<void> {
  const res = await authFetch(`${API_URL}/api/auth/users/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
}

// ============================================================
// Settings
// ============================================================

export async function getSettings(): Promise<SettingsMap> {
  const res = await fetch(`${API_URL}/api/settings`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const json = await res.json();
  return json.data;
}

export async function saveSettings(entries: SettingEntry[]): Promise<SettingsMap> {
  const res = await authFetch(`${API_URL}/api/settings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ entries }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `API error: ${res.status}`);
  }
  const json = await res.json();
  return json.data;
}

export async function deleteSetting(key: string): Promise<void> {
  const res = await authFetch(`${API_URL}/api/settings/${key}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
}
