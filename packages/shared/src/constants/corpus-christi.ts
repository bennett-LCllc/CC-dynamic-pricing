// ============================================================
// Corpus Christi Market Constants
// ============================================================

export const CORPUS_CHRISTI = {
  city: 'Corpus Christi',
  state: 'TX',
  timezone: 'America/Chicago',
  zipCodes: ['78401', '78402', '78404', '78405', '78406', '78407', '78408', '78409', '78410', '78411', '78412', '78413', '78414', '78415', '78416', '78417', '78418', '78419', '78460', '78472'],
} as const;

// ============================================================
// Seasonal Pricing Multipliers (Corpus Christi STR)
// ============================================================

export const SEASONAL_MULTIPLIERS: Record<string, number> = {
  // Low season (cooler, fewer tourists)
  '12': 0.80,  // December (except holidays)
  '1': 0.75,   // January
  '2': 0.80,   // February (except spring break)

  // Shoulder season (warming up / cooling down)
  '3': 1.10,   // March (spring break premium)
  '4': 1.00,   // April
  '10': 1.05,  // October
  '11': 0.90,  // November (except Thanksgiving)

  // Peak season (beach weather, summer)
  '5': 1.15,   // May (Memorial Day)
  '6': 1.25,   // June
  '7': 1.30,   // July (peak summer)
  '8': 1.25,   // August
  '9': 1.10,   // September (Labor Day + still warm)
};

// ============================================================
// Day-of-Week Multipliers
// ============================================================

export const DOW_MULTIPLIERS: Record<number, number> = {
  0: 0.85,  // Sunday
  1: 0.80,  // Monday
  2: 0.85,  // Tuesday
  3: 0.95,  // Wednesday
  4: 1.10,  // Thursday
  5: 1.25,  // Friday
  6: 1.20,  // Saturday
};

// ============================================================
// Major Events (Corpus Christi area)
// ============================================================

export const MAJOR_EVENTS: Array<{
  name: string;
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
  rateMultiplier: number;
  description: string;
}> = [
  { name: 'Spring Break', startMonth: 3, startDay: 1, endMonth: 3, endDay: 31, rateMultiplier: 1.40, description: 'Spring Break season — highest demand surge' },
  { name: 'Memorial Day', startMonth: 5, startDay: 24, endMonth: 5, endDay: 27, rateMultiplier: 1.35, description: 'Memorial Day weekend' },
  { name: 'Fourth of July', startMonth: 7, startDay: 1, endMonth: 7, endDay: 7, rateMultiplier: 1.30, description: 'Independence Day week' },
  { name: 'Labor Day', startMonth: 9, startDay: 1, endMonth: 9, endDay: 5, rateMultiplier: 1.30, description: 'Labor Day weekend' },
  { name: 'Hurricane Season', startMonth: 6, startDay: 1, endMonth: 11, endDay: 30, rateMultiplier: 1.0, description: 'Monitor closely — can cause cancellations' },
  { name: 'Buccaneer Days', startMonth: 5, startDay: 1, endMonth: 5, endDay: 15, rateMultiplier: 1.25, description: 'Corpus Christi annual festival' },
  { name: 'Cattle Baron\'s Ball', startMonth: 10, startDay: 1, endMonth: 10, endDay: 31, rateMultiplier: 1.15, description: 'Major fundraiser, draws visitors' },
  { name: 'NASCC Graduations', startMonth: 12, startDay: 1, endMonth: 12, endDay: 31, rateMultiplier: 1.15, description: 'Naval Air Station graduations (sporadic peaks)' },
  { name: 'Christmas / New Year', startMonth: 12, startDay: 23, endMonth: 1, endDay: 2, rateMultiplier: 1.20, description: 'Holiday travel peak' },
  { name: 'Texas State Aquarium Events', startMonth: 1, startDay: 1, endMonth: 12, endDay: 31, rateMultiplier: 1.0, description: 'Recurring events that draw steady traffic' },
];

// ============================================================
// Default Pricing Floors by Property Type
// ============================================================

export const PRICING_FLOORS: Record<string, { oneBedroom: number; basePerBedroom: number }> = {
  BEACHFRONT: { oneBedroom: 150, basePerBedroom: 50 },
  WATERFRONT: { oneBedroom: 120, basePerBedroom: 45 },
  STANDARD: { oneBedroom: 80, basePerBedroom: 35 },
  BUDGET: { oneBedroom: 60, basePerBedroom: 25 },
};

// ============================================================
// Lawn Care Defaults
// ============================================================

export const LAWN_PRICING: Record<string, { min: number; max: number }> = {
  EIGHTH_ACRE: { min: 40, max: 60 },
  QUARTER_ACRE: { min: 60, max: 100 },
  HALF_ACRE: { min: 80, max: 140 },
  ACRE: { min: 120, max: 200 },
  LARGE: { min: 180, max: 300 },
  COMMERCIAL: { min: 200, max: 500 },
};

export const LAWN_ADD_ONS: Record<string, number> = {
  FERTILIZE: 40,
  WEED_CONTROL: 35,
  AERATE: 60,
  OVERSEED: 80,
  PALM_TRIM: 75,
  PRESSURE_WASH: 100,
  LEAF_REMOVAL: 50,
};

// ============================================================
// Cleaning Defaults
// ============================================================

export const CLEANING_PRICING: Record<string, { turnover: number; deepClean: number }> = {
  '1BR_1BA': { turnover: 120, deepClean: 200 },
  '2BR_1BA': { turnover: 160, deepClean: 275 },
  '2BR_2BA': { turnover: 180, deepClean: 310 },
  '3BR_2BA': { turnover: 220, deepClean: 375 },
  '4BR_2BA': { turnover: 270, deepClean: 450 },
  '4BR_3BA': { turnover: 300, deepClean: 500 },
  '5BR_PLUS': { turnover: 350, deepClean: 600 },
};

// ============================================================
// Platform Fees
// ============================================================

export const PLATFORM_FEES: Record<string, number> = {
  AIRBNB_HOST: 0.03,     // 3% host fee (simplified)
  AIRBNB_GUEST: 0.14,    // ~14% guest service fee (for reference)
  VRBO_HOST: 0.05,       // 5% host fee (simplified)
  BOOKING_COM: 0.15,     // 15% commission
  DIRECT: 0.025,          // 2.5% Stripe processing
};
