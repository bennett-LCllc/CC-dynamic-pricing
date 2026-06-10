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

export interface Booking {
  id: string;
  propertyId: string;
  property?: PropertySummary | null;
  platform: Platform;
  platformBookingId?: string | null;
  guestName: string;
  guestEmail?: string | null;
  guestPhone?: string | null;
  guestCount: number;
  petCount: number;
  checkIn: string;
  checkOut: string;
  checkInTime: string;
  checkoutTime: string;
  nightlyRate: number;
  totalNights: number;
  subtotal: number;
  cleaningFee: number;
  petFee: number;
  platformFee: number;
  totalAmount: number;
  status: BookingStatus;
  source: BookingSource;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBookingInput {
  propertyId: string;
  platform?: Platform;
  platformBookingId?: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  guestCount?: number;
  petCount?: number;
  checkIn: string;
  checkOut: string;
  checkInTime?: string;
  checkoutTime?: string;
  nightlyRate: number;
  totalNights?: number;
  subtotal?: number;
  cleaningFee?: number;
  petFee?: number;
  platformFee?: number;
  totalAmount?: number;
  status?: BookingStatus;
  source?: BookingSource;
  notes?: string;
}

export type UpdateBookingInput = Partial<CreateBookingInput>;

export type Platform = 'AIRBNB' | 'VRBO' | 'BOOKING_COM' | 'DIRECT';
export type BookingStatus = 'INQUIRY' | 'CONFIRMED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED' | 'NO_SHOW';
export type BookingSource = 'AIRBNB' | 'VRBO' | 'BOOKING_COM' | 'DIRECT' | 'REFERRAL';

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

export type CleaningType = 'TURNOVER' | 'DEEP_CLEAN' | 'MOVE_IN_OUT' | 'MID_STAY' | 'POST_CONSTRUCTION';
export type JobStatus = 'PENDING' | 'SCHEDULED' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'ISSUE_REPORTED' | 'QUALITY_CHECK';

export interface CleaningJobSummary {
  id: string;
  propertyId: string;
  property?: { id: string; name: string; address?: string | null; slug?: string; zipCode?: string } | null;
  bookingId?: string | null;
  booking?: { id: string; guestName: string; checkIn: string; checkOut: string } | null;
  scheduledStart: string;
  scheduledEnd: string;
  cleaningType: CleaningType;
  status: JobStatus;
  cleanerId?: string | null;
  cleaner?: { id: string; name: string; phone?: string | null } | null;
  customerCharge?: number | string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CleaningJob {
  id: string;
  propertyId: string;
  property?: { id: string; name: string; address?: string | null; slug?: string; zipCode?: string } | null;
  bookingId?: string | null;
  booking?: { id: string; guestName: string; checkIn: string; checkOut: string } | null;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart?: string | null;
  actualEnd?: string | null;
  cleaningType: CleaningType;
  status: JobStatus;
  cleanerId?: string | null;
  cleaner?: { id: string; name: string; phone?: string | null } | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  squareFeet?: number | null;
  customerCharge?: number | string | null;
  laborCost?: number | string | null;
  supplyCost?: number | string | null;
  travelCost?: number | string | null;
  notes?: string | null;
  checklist?: CleaningChecklist | null;
  photos?: CleaningPhoto[];
  createdAt: string;
  updatedAt: string;
}

export interface CleaningChecklist {
  id: string;
  jobId: string;
  tasks: Record<string, boolean>;
  completedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CleaningPhoto {
  id: string;
  jobId: string;
  url: string;
  category?: string | null;
  sortOrder: number;
  createdAt: string;
}

export interface Cleaner {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  hourlyRate?: number | string | null;
  isActive: boolean;
}

export interface CreateCleaningJobInput {
  propertyId: string;
  bookingId?: string;
  scheduledStart: string;
  scheduledEnd: string;
  cleaningType: CleaningType;
  status?: JobStatus;
  cleanerId?: string;
  bedrooms?: number;
  bathrooms?: number;
  squareFeet?: number;
  customerCharge?: number;
  laborCost?: number;
  supplyCost?: number;
  travelCost?: number;
  notes?: string;
}

export type UpdateCleaningJobInput = Partial<CreateCleaningJobInput>;

export interface CleaningJobFilters {
  statuses?: string[];
  propertyId?: string;
  cleanerId?: string;
  fromDate?: string;
  toDate?: string;
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

export interface LawnCrew {
  id: string;
  name: string;
  phone: string | null;
  hourlyRate: number | null;
}

export interface LawnPhoto {
  id: string;
  jobId: string;
  url: string;
  category: string;
  sortOrder: number;
  createdAt: string;
}

export interface LawnJob {
  id: string;
  propertyId: string;
  property?: { id: string; name: string; address: string | null; slug: string; zipCode: string } | null;
  crewId: string | null;
  crew: LawnCrew | null;
  scheduledDate: string;
  scheduledTime: string | null;
  completedAt: string | null;
  serviceType: string;
  lotSize: string | null;
  status: string;
  notes: string | null;
  customerCharge: number | string | null;
  laborCost: number | string | null;
  materialCost: number | string | null;
  photos: LawnPhoto[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateLawnJobInput {
  propertyId: string;
  crewId?: string;
  scheduledDate: string;
  scheduledTime?: string;
  serviceType: string;
  lotSize?: string;
  status?: string;
  customerCharge?: number;
  laborCost?: number;
  materialCost?: number;
  notes?: string;
}

export type UpdateLawnJobInput = Partial<CreateLawnJobInput>;

export interface LawnJobFilters {
  statuses?: string[];
  propertyId?: string;
  crewId?: string;
  fromDate?: string;
  toDate?: string;
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

export type ExpenseCategory =
  | 'MORTGAGE'
  | 'INSURANCE'
  | 'PROPERTY_TAX'
  | 'UTILITIES'
  | 'INTERNET'
  | 'WATER'
  | 'ELECTRIC'
  | 'GAS'
  | 'TRASH'
  | 'HOA'
  | 'MAINTENANCE'
  | 'REPAIRS'
  | 'SUPPLIES'
  | 'FURNISHING'
  | 'LINENS'
  | 'CLEANING_SUPPLIES'
  | 'LAWN_SUPPLIES'
  | 'EQUIPMENT'
  | 'SOFTWARE'
  | 'MARKETING'
  | 'PLATFORM_FEES'
  | 'LEGAL'
  | 'ACCOUNTING'
  | 'TRAVEL'
  | 'FUEL'
  | 'LABOR'
  | 'OTHER';

export type LLC = 'STR' | 'LAWN' | 'CLEANING';

export type RecurringInterval = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';

export interface Expense {
  id: string;
  propertyId: string | null;
  property?: { id: string; name: string } | null;
  category: ExpenseCategory;
  description: string;
  amount: number;
  date: string;
  incurredBy: LLC;
  paidFrom: string | null;
  receiptUrl: string | null;
  vendor: string | null;
  isRecurring: boolean;
  recurringInterval: RecurringInterval | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpenseInput {
  propertyId?: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  date: string;
  incurredBy?: LLC;
  paidFrom?: string;
  receiptUrl?: string;
  vendor?: string;
  isRecurring?: boolean;
  recurringInterval?: RecurringInterval;
  notes?: string;
}

export type UpdateExpenseInput = Partial<CreateExpenseInput>;

export interface ExpenseFilters {
  propertyId?: string;
  category?: string;
  incurredBy?: LLC;
  fromDate?: string;
  toDate?: string;
}

export interface FinancialOverview {
  period: string;
  llcs: {
    str: { revenue: number; expenses: number; netIncome: number };
    lawn: { revenue: number; expenses: number; netIncome: number };
    cleaning: { revenue: number; expenses: number; netIncome: number };
  };
  consolidated: { revenue: number; expenses: number; netIncome: number };
  expenseBreakdown: ExpenseBreakdown[];
}

// ============================================================
// Customer Types (Lawn & Cleaning external customers)
// ============================================================

export type CustomerType = 'STR_OWNER' | 'PM_COMPANY' | 'RESIDENTIAL' | 'COMMERCIAL';
export type CustomerStatus = 'ACTIVE' | 'INACTIVE' | 'CHURNED';
export type LotSize = 'EIGHTH_ACRE' | 'QUARTER_ACRE' | 'HALF_ACRE' | 'ACRE' | 'LARGE' | 'COMMERCIAL';
export type LawnPackage = 'BASIC' | 'STANDARD' | 'PREMIUM' | 'SHOWCASE';
export type CleaningFrequency = 'PER_TURNOVER' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
export type ServiceType = 'MOW' | 'EDGE' | 'TRIM' | 'FERTILIZE' | 'WEED_CONTROL' | 'AERATE' | 'OVERSEED' | 'LEAF_REMOVAL' | 'PRESSURE_WASH' | 'FULL_SERVICE';

export interface CustomerProperty {
  id: string;
  customerId: string;
  name?: string | null;
  address: string;
  zipCode: string;
  propertyType: PropertyType;
  bedrooms?: number | null;
  bathrooms?: number | null;
  squareFeet?: number | null;
  lotSize: LotSize;
  isActive: boolean;
  lawnPackage?: LawnPackage | null;
  cleaningPackage?: CleaningFrequency | null;
  createdAt: string;
  updatedAt: string;
}

export interface ExternalLawnJob {
  id: string;
  customerId: string;
  propertyAddress: string;
  scheduledDate: string;
  completedAt?: string | null;
  crewId?: string | null;
  serviceType: ServiceType;
  status: JobStatus;
  customerCharge: number;
  notes?: string | null;
  createdAt: string;
}

export interface ExternalCleaningJob {
  id: string;
  customerId: string;
  propertyAddress: string;
  scheduledStart: string;
  completedAt?: string | null;
  cleanerId?: string | null;
  cleaningType: CleaningType;
  status: JobStatus;
  customerCharge: number;
  notes?: string | null;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  email?: string | null;
  phone: string;
  company?: string | null;
  type: CustomerType;
  status: CustomerStatus;
  stripeCustomerId?: string | null;
  notes?: string | null;
  properties?: CustomerProperty[];
  lawnJobs?: ExternalLawnJob[];
  cleaningJobs?: ExternalCleaningJob[];
  createdAt: string;
  updatedAt: string;
}

export interface CustomerSummary {
  id: string;
  name: string;
  email: string | null;
  phone: string;
  type: CustomerType;
  status: CustomerStatus;
  propertyCount: number;
  monthlyRecurringRevenue: number;
  lastServiceDate: string | null;
  createdAt: string;
}

export interface CreateCustomerInput {
  name: string;
  email?: string;
  phone: string;
  company?: string;
  type?: CustomerType;
  status?: CustomerStatus;
  stripeCustomerId?: string;
  notes?: string;
}

export type UpdateCustomerInput = Partial<CreateCustomerInput>;

export interface CustomerFilters {
  search?: string;
  type?: CustomerType;
  status?: CustomerStatus;
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

export interface CreateMessageTemplateInput {
  trigger: string;
  name: string;
  subject?: string;
  content: string;
  channel?: 'AIRBNB' | 'VRBO' | 'SMS' | 'EMAIL';
  isActive?: boolean;
  variables?: string[];
}

export type UpdateMessageTemplateInput = Partial<CreateMessageTemplateInput>;

export interface CreateMessageInput {
  bookingId: string;
  direction: 'INBOUND' | 'OUTBOUND';
  channel?: 'AIRBNB' | 'VRBO' | 'SMS' | 'EMAIL';
  content: string;
  templateId?: string;
  automated?: boolean;
  sentAt?: string;
}

export type UpdateMessageInput = Partial<CreateMessageInput>;

export interface MessageFilters {
  bookingId?: string;
  direction?: string;
  channel?: string;
  automated?: boolean;
}

// ============================================================
// Auth
// ============================================================

export type UserRole = 'ADMIN' | 'MANAGER' | 'VIEWER';

export interface User {
  id: string;
  name: string | null;
  email: string | null;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface AuthLoginInput {
  email: string;
  password: string;
}

export interface AuthRegisterInput {
  name?: string;
  email: string;
  password: string;
  role?: UserRole;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface UpdateUserInput {
  name?: string;
  email?: string;
  role?: UserRole;
  password?: string;
}

// ============================================================
// Settings
// ============================================================

export interface SettingEntry {
  key: string;
  value: string;
}

export interface SettingsMap {
  [key: string]: string;
}
