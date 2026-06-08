import {
  SEASONAL_MULTIPLIERS,
  DOW_MULTIPLIERS,
  MAJOR_EVENTS,
  PRICING_FLOORS,
} from '../constants/corpus-christi.js';
import type { PricingFactors, CompetitorRate } from '../types/index.js';

/**
 * Calculate the dynamic nightly rate for a property on a given date.
 * This is the core pricing engine function.
 */
export function calculateNightlyRate(params: {
  baseRate: number;
  date: Date;
  propertyType?: 'BEACHFRONT' | 'WATERFRONT' | 'STANDARD' | 'BUDGET';
  bedrooms?: number;
  upcomingOccupancyRate?: number; // 0-1, based on next 14 days
  minStayDiscount?: number; // e.g., 0.10 for 10% off for 3+ night stays
  earlyBirdDiscount?: number; // e.g., 0.10 for booking 30+ days ahead
}): PricingFactors {
  const {
    baseRate,
    date,
    propertyType = 'STANDARD',
    bedrooms = 2,
    upcomingOccupancyRate = 0.5,
    minStayDiscount = 0,
    earlyBirdDiscount = 0,
  } = params;

  // 1. Seasonal multiplier
  const month = String(date.getMonth() + 1);
  const seasonalMultiplier = SEASONAL_MULTIPLIERS[month] ?? 1.0;

  // 2. Day-of-week multiplier
  const dayOfWeek = date.getDay();
  const dowMultiplier = DOW_MULTIPLIERS[dayOfWeek] ?? 1.0;

  // 3. Event multiplier — check if date falls within any major event
  let eventMultiplier = 1.0;
  for (const event of MAJOR_EVENTS) {
    const eventStart = new Date(date.getFullYear(), event.startMonth - 1, event.startDay);
    const eventEnd = new Date(date.getFullYear(), event.endMonth - 1, event.endDay);
    if (date >= eventStart && date <= eventEnd) {
      eventMultiplier = Math.max(eventMultiplier, event.rateMultiplier);
    }
  }

  // 4. Occupancy urgency — raise rates when nearly booked, discount to fill gaps
  let occupancyMultiplier = 1.0;
  if (upcomingOccupancyRate >= 0.9) {
    occupancyMultiplier = 1.30; // Nearly sold out → premium pricing
  } else if (upcomingOccupancyRate >= 0.8) {
    occupancyMultiplier = 1.15; // High demand → slight premium
  } else if (upcomingOccupancyRate >= 0.5) {
    occupancyMultiplier = 1.0;  // Normal
  } else if (upcomingOccupancyRate >= 0.3) {
    occupancyMultiplier = 0.90; // Below target → slight discount
  } else {
    occupancyMultiplier = 0.80; // Significant gap → aggressive discount
  }

  // 5. Calculate pre-discount rate
  const calculatedRate =
    baseRate *
    seasonalMultiplier *
    dowMultiplier *
    eventMultiplier *
    occupancyMultiplier;

  // 6. Apply discounts (stacks, but capped)
  const totalDiscount = Math.min(minStayDiscount + earlyBirdDiscount, 0.20); // Max 20% discount
  const discountedRate = calculatedRate * (1 - totalDiscount);

  // 7. Apply floor/ceiling based on property type
  const floorConfig = PRICING_FLOORS[propertyType];
  const floor = floorConfig
    ? floorConfig.oneBedroom + (bedrooms - 1) * floorConfig.basePerBedroom
    : baseRate * 0.5;
  const ceiling = floor * 3.5;

  const finalRate = Math.min(Math.max(discountedRate, floor), ceiling);

  return {
    baseRate,
    seasonalMultiplier,
    dowMultiplier,
    eventMultiplier,
    occupancyMultiplier,
    calculatedRate: Math.round(calculatedRate * 100) / 100,
    floor,
    ceiling,
    finalRate: Math.round(finalRate / 10) * 10, // Round to nearest $10
  };
}

/**
 * Generate a 30-day pricing forecast for a property.
 */
export function generatePricingForecast(params: {
  baseRate: number;
  startDate?: Date;
  propertyType?: 'BEACHFRONT' | 'WATERFRONT' | 'STANDARD' | 'BUDGET';
  bedrooms?: number;
  existingBookings?: Array<{ checkIn: Date; checkOut: Date }>;
  days?: number;
}): Array<{ date: string; rate: number; factors: PricingFactors; isBooked: boolean }> {
  const {
    baseRate,
    startDate = new Date(),
    propertyType = 'STANDARD',
    bedrooms = 2,
    existingBookings = [],
    days = 30,
  } = params;

  const forecast: Array<{ date: string; rate: number; factors: PricingFactors; isBooked: boolean }> = [];

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    // Check if date falls within an existing booking
    const isBooked = existingBookings.some(
      (booking) => date >= booking.checkIn && date < booking.checkOut
    );

    // Calculate occupancy rate for next 14 days
    const next14Days = Array.from({ length: 14 }, (_, j) => {
      const d = new Date(date);
      d.setDate(d.getDate() + j);
      return existingBookings.some((b) => d >= b.checkIn && d < b.checkOut);
    });
    const upcomingOccupancy = next14Days.filter(Boolean).length / 14;

    const factors = calculateNightlyRate({
      baseRate,
      date,
      propertyType,
      bedrooms,
      upcomingOccupancyRate: upcomingOccupancy,
    });

    forecast.push({
      date: date.toISOString().split('T')[0],
      rate: isBooked ? 0 : factors.finalRate,
      factors,
      isBooked,
    });
  }

  return forecast;
}

/**
 * Generate competitor rate estimate (placeholder for when you integrate
 * Airbnb market data or scraping).
 */
export function estimateCompetitorRates(params: {
  zipCode: string;
  bedrooms: number;
  date: Date;
}): CompetitorRate {
  // TODO: Replace with actual Airbnb market data integration
  // For now, return Corpus Christi averages
  const baseEstimates: Record<number, { avg: number; p25: number; p50: number; p75: number; p90: number }> = {
    1: { avg: 110, p25: 80, p50: 105, p75: 130, p90: 170 },
    2: { avg: 175, p25: 130, p50: 165, p75: 210, p90: 280 },
    3: { avg: 240, p25: 180, p50: 225, p75: 290, p90: 380 },
    4: { avg: 310, p25: 230, p50: 290, p75: 370, p90: 480 },
    5: { avg: 400, p25: 300, p50: 380, p75: 480, p90: 620 },
  };

  const estimate = baseEstimates[params.bedrooms] || baseEstimates[3];

  return {
    avgRate: estimate.avg,
    p25Rate: estimate.p25,
    p50Rate: estimate.p50,
    p75Rate: estimate.p75,
    p90Rate: estimate.p90,
    sampleSize: 0, // Will be populated when integration is live
  };
}

/**
 * Calculate revenue metrics for a property.
 */
export function calculatePropertyMetrics(params: {
  bookings: Array<{ checkIn: Date; checkOut: Date; totalAmount: number }>;
  periodStart: Date;
  periodEnd: Date;
  totalNightsInPeriod: number;
}) {
  const { bookings, periodStart, periodEnd, totalNightsInPeriod } = params;

  const periodBookings = bookings.filter(
    (b) => b.checkIn >= periodStart && b.checkIn < periodEnd
  );

  const revenue = periodBookings.reduce((sum, b) => sum + b.totalAmount, 0);
  const nights = periodBookings.reduce((sum, b) => {
    const end = b.checkOut > periodEnd ? periodEnd : b.checkOut;
    const start = b.checkIn < periodStart ? periodStart : b.checkIn;
    return sum + Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }, 0);

  return {
    revenue,
    nightsSold: nights,
    occupancyRate: totalNightsInPeriod > 0 ? nights / totalNightsInPeriod : 0,
    adr: nights > 0 ? revenue / nights : 0, // Average Daily Rate
    revpar: totalNightsInPeriod > 0 ? revenue / totalNightsInPeriod : 0, // Revenue per Available Room
    bookingCount: periodBookings.length,
  };
}
