// ============================================================
// Core Platform Types
// ============================================================

export type PropertyType = 'HOUSE' | 'CONDO' | 'TOWNHOUSE' | 'DUPLEX' | 'TRIPLEX' | 'APARTMENT' | 'CABIN';
export type PropertyStatus = 'ACTIVE' | 'INACTIVE' | 'UNDER_RENOVATION' | 'SOLD';
export type PhotoCategory = 'EXTERIOR' | 'INTERIOR' | 'KITCHEN' | 'BATHROOM' | 'BEDROOM' | 'LIVING_ROOM' | 'POOL' | 'YARD' | 'DAMAGE' | 'BEFORE_AFTER' | 'OTHER';

export interface PropertyPhoto {
  id: string;
  propertyId: string;
  url: string;
  caption?: string | null;
  category: PhotoCategory;
  sortOrder: number;
  createdAt: string;
}

export interface Property {
  id: string;
  name: string;
  slug: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude?: number | null;
  longitude?: number | null;
  type: PropertyType;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  squareFeet?: number | null;
  lotSizeSqFt?: number | null;
  yearBuilt?: number | null;
  description?: string | null;
  amenities: string[];
  baseRate: number;
  cleaningFee: number;
  petFee: number;
  isPetFriendly: boolean;
  hasPool: boolean;
  hasHotTub: boolean;
  isBeachfront: boolean;
  status: PropertyStatus;
  listingUrlAirbnb?: string | null;
  listingUrlVrbo?: string | null;
  photos?: PropertyPhoto[];
  createdAt: string;
  updatedAt: string;
}

export interface PropertyListItem {
  id: string;
  name: string;
  slug: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  type: PropertyType;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  baseRate: number;
  status: PropertyStatus;
  isPetFriendly: boolean;
  hasPool: boolean;
  isBeachfront: boolean;
  photoCount: number;
  occupancyThisMonth: number;
  revenueThisMonth: number;
  activeBookingCount: number;
}

export interface CreatePropertyInput {
  name: string;
  address: string;
  zipCode: string;
  type?: PropertyType;
  bedrooms: number;
  bathrooms: number;
  maxGuests: number;
  city?: string;
  state?: string;
  latitude?: number;
  longitude?: number;
  squareFeet?: number;
  lotSizeSqFt?: number;
  yearBuilt?: number;
  description?: string;
  amenities?: string[];
  baseRate: number;
  cleaningFee?: number;
  petFee?: number;
  isPetFriendly?: boolean;
  hasPool?: boolean;
  hasHotTub?: boolean;
  isBeachfront?: boolean;
  status?: PropertyStatus;
  listingUrlAirbnb?: string;
  listingUrlVrbo?: string;
}

export type UpdatePropertyInput = Partial<CreatePropertyInput>;

export interface PropertySummary {
  id: string;
  name: string;
  slug: string;
  address: string;
  zipCode: string;
  bedrooms: number;
  bathrooms: number;
  baseRate: number;
  status: PropertyStatus;
  currentBooking?: BookingSummary | null;
  nextBooking?: BookingSummary | null;
  occupancyThisMonth: number; // 0-100
  revenueThisMonth: number;
}

export interface BookingSummary {
  id: string;
  guestName: string;
  checkIn: string;  // ISO date
  checkOut: string; // ISO date
  nightlyRate: number;
  totalAmount: number;
  platform: 'AIRBNB' | 'VRBO' | 'BOOKING_COM' | 'DIRECT';
  status: 'CONFIRMED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  guestCount: number;
}

export interface CleaningJobSummary {
  id: string;
  propertyName: string;
  address: string;
  scheduledStart: string;
  scheduledEnd: string;
  cleaningType: 'TURNOVER' | 'DEEP_CLEAN' | 'MOVE_IN_OUT' | 'MID_STAY';
  status: 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'ISSUE_REPORTED';
  cleanerName: string;
  customerCharge: number;
  hasPhotos: boolean;
  issueReported: boolean;
}

export interface LawnJobSummary {
  id: string;
  address: string;
  scheduledDate: string;
  serviceType: 'MOW' | 'EDGE' | 'TRIM' | 'FERTILIZE' | 'FULL_SERVICE';
  status: 'PENDING' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'ISSUE_REPORTED';
  crewName: string;
  customerCharge: number;
  hasPhotos: boolean;
}

// ============================================================
// Financial Types
// ============================================================

export interface FinancialSummary {
  period: string;
  strRevenue: number;
  strExpenses: number;
  strNetIncome: number;
  lawnRevenue: number;
  lawnExpenses: number;
  lawnNetIncome: number;
  cleaningRevenue: number;
  cleaningExpenses: number;
  cleaningNetIncome: number;
  consolidatedRevenue: number;
  consolidatedExpenses: number;
  consolidatedNetIncome: number;
}

export interface PropertyFinancials {
  propertyId: string;
  propertyName: string;
  period: string;
  revenue: number;
  expenses: {
    mortgage: number;
    insurance: number;
    utilities: number;
    lawnCare: number;
    cleaning: number;
    supplies: number;
    maintenance: number;
    platformFees: number;
    other: number;
    total: number;
  };
  netIncome: number;
  capRate: number | null;
  cashOnCashReturn: number | null;
}

export interface ExpenseBreakdown {
  category: string;
  amount: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
}

// ============================================================
// Customer Types (Lawn & Cleaning external customers)
// ============================================================

export interface CustomerSummary {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  type: 'STR_OWNER' | 'PM_COMPANY' | 'RESIDENTIAL' | 'COMMERCIAL';
  status: 'ACTIVE' | 'INACTIVE' | 'CHURNED';
  propertyCount: number;
  monthlyRecurringRevenue: number;
  lastServiceDate: string | null;
  createdAt: string;
}

// ============================================================
// Dashboard Types
// ============================================================

export interface DashboardOverview {
  properties: {
    total: number;
    occupied: number;
    available: number;
    occupancyRate: number;
  };
  today: {
    checkIns: number;
    checkOuts: number;
    cleaningsScheduled: number;
    lawnJobsScheduled: number;
  };
  revenue: {
    mtd: number;
    ytd: number;
    projectedMonthly: number;
  };
  upcomingJobs: {
    cleaning: CleaningJobSummary[];
    lawn: LawnJobSummary[];
  };
  alerts: Alert[];
}

export interface Alert {
  id: string;
  type: 'BOOKING_CLEANING_GAP' | 'LOW_RATING' | 'MAINTENANCE' | 'PAYMENT_OVERDUE' | 'LABOR_ISSUE';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  propertyName?: string;
  actionUrl?: string;
  createdAt: string;
}

// ============================================================
// Pricing Types
// ============================================================

export interface PricingFactors {
  baseRate: number;
  seasonalMultiplier: number;
  dowMultiplier: number;
  eventMultiplier: number;
  occupancyMultiplier: number;
  calculatedRate: number;
  floor: number;
  ceiling: number;
  finalRate: number;
}

export interface CompetitorRate {
  avgRate: number;
  p25Rate: number;
  p50Rate: number;
  p75Rate: number;
  p90Rate: number;
  sampleSize: number;
}

// ============================================================
// Message / Automation Types
// ============================================================

export interface MessageTemplate {
  id: string;
  trigger: string;
  name: string;
  subject?: string;
  content: string;
  channel: 'AIRBNB' | 'VRBO' | 'SMS' | 'EMAIL';
  isActive: boolean;
  variables: string[];
}

export interface GuestMessage {
  id: string;
  bookingId: string;
  guestName: string;
  direction: 'INBOUND' | 'OUTBOUND';
  content: string;
  sentAt: string;
  automated: boolean;
  channel: 'AIRBNB' | 'VRBO' | 'SMS' | 'EMAIL';
}
