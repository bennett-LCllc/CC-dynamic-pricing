import { describe, expect, it } from 'vitest';
import {
  calculateNightlyRate,
  calculatePropertyMetrics,
  generatePricingForecast,
} from '../utils/pricing';

describe('calculateNightlyRate', () => {
  it('calculates rate with base parameters', () => {
    const result = calculateNightlyRate({
      baseRate: 200,
      date: new Date('2024-07-15'),
      propertyType: 'STANDARD',
    });
    expect(result.finalRate).toBeGreaterThan(0);
    expect(result.baseRate).toBe(200);
    expect(result.seasonalMultiplier).toBeGreaterThan(0);
    expect(result.dowMultiplier).toBeGreaterThan(0);
  });

  it('applies seasonal multiplier for summer months', () => {
    const summer = calculateNightlyRate({
      baseRate: 200,
      date: new Date('2024-07-15'),
      propertyType: 'STANDARD',
    });
    const winter = calculateNightlyRate({
      baseRate: 200,
      date: new Date('2024-01-15'),
      propertyType: 'STANDARD',
    });
    // July should have higher seasonal multiplier than January
    expect(summer.seasonalMultiplier).toBeGreaterThanOrEqual(winter.seasonalMultiplier);
  });

  it('applies day-of-week multiplier for weekends', () => {
    const friday = calculateNightlyRate({
      baseRate: 200,
      date: new Date('2024-07-19'), // Friday
      propertyType: 'STANDARD',
    });
    const tuesday = calculateNightlyRate({
      baseRate: 200,
      date: new Date('2024-07-16'), // Tuesday
      propertyType: 'STANDARD',
    });
    // Weekend should have higher or equal DOW multiplier
    expect(friday.dowMultiplier).toBeGreaterThanOrEqual(tuesday.dowMultiplier);
  });

  it('respects pricing floors and ceilings', () => {
    const result = calculateNightlyRate({
      baseRate: 10, // Very low base rate
      date: new Date('2024-07-15'),
      propertyType: 'STANDARD',
      bedrooms: 2,
    });
    // Should not go below floor
    expect(result.finalRate).toBeGreaterThanOrEqual(result.floor);
    // Should not exceed ceiling
    expect(result.finalRate).toBeLessThanOrEqual(result.ceiling);
  });

  it('applies occupancy discounts for low occupancy', () => {
    const highOccupancy = calculateNightlyRate({
      baseRate: 200,
      date: new Date('2024-07-15'),
      propertyType: 'STANDARD',
      upcomingOccupancyRate: 0.95,
    });
    const lowOccupancy = calculateNightlyRate({
      baseRate: 200,
      date: new Date('2024-07-15'),
      propertyType: 'STANDARD',
      upcomingOccupancyRate: 0.2,
    });
    // Low occupancy should have lower final rate due to discount
    expect(lowOccupancy.finalRate).toBeLessThan(highOccupancy.finalRate);
  });
});

describe('generatePricingForecast', () => {
  it('generates 30-day forecast by default', () => {
    const forecast = generatePricingForecast({
      baseRate: 200,
      startDate: new Date('2024-07-01'),
      propertyType: 'STANDARD',
    });
    expect(forecast).toHaveLength(30);
    forecast.forEach((day) => {
      expect(day).toHaveProperty('date');
      expect(day).toHaveProperty('rate');
      expect(day).toHaveProperty('factors');
      expect(day).toHaveProperty('isBooked');
    });
  });

  it('marks booked days correctly', () => {
    const forecast = generatePricingForecast({
      baseRate: 200,
      startDate: new Date('2024-07-01'),
      propertyType: 'STANDARD',
      existingBookings: [{ checkIn: new Date('2024-07-05'), checkOut: new Date('2024-07-08') }],
    });
    const bookedDay = forecast.find((d) => d.date === '2024-07-06');
    const freeDay = forecast.find((d) => d.date === '2024-07-10');
    expect(bookedDay?.isBooked).toBe(true);
    expect(bookedDay?.rate).toBe(0);
    expect(freeDay?.isBooked).toBe(false);
    expect(freeDay?.rate).toBeGreaterThan(0);
  });

  it('respects custom days parameter', () => {
    const forecast = generatePricingForecast({
      baseRate: 200,
      startDate: new Date('2024-07-01'),
      propertyType: 'STANDARD',
      days: 7,
    });
    expect(forecast).toHaveLength(7);
  });
});

describe('calculatePropertyMetrics', () => {
  it('calculates revenue and occupancy correctly', () => {
    const bookings = [
      { checkIn: new Date('2024-07-01'), checkOut: new Date('2024-07-04'), totalAmount: 600 }, // 3 nights
      { checkIn: new Date('2024-07-10'), checkOut: new Date('2024-07-12'), totalAmount: 400 }, // 2 nights
    ];
    const periodStart = new Date('2024-07-01');
    const periodEnd = new Date('2024-07-31');
    const totalNightsInPeriod = 31;

    const metrics = calculatePropertyMetrics({
      bookings,
      periodStart,
      periodEnd,
      totalNightsInPeriod,
    });

    expect(metrics.revenue).toBe(1000);
    expect(metrics.nightsSold).toBe(5);
    expect(metrics.occupancyRate).toBeCloseTo(5 / 31);
    expect(metrics.adr).toBe(200); // 1000 / 5
    expect(metrics.revpar).toBeCloseTo(1000 / 31);
    expect(metrics.bookingCount).toBe(2);
  });

  it('handles bookings outside period', () => {
    const bookings = [
      { checkIn: new Date('2024-06-15'), checkOut: new Date('2024-06-20'), totalAmount: 500 }, // Before period
      { checkIn: new Date('2024-08-01'), checkOut: new Date('2024-08-05'), totalAmount: 500 }, // After period
    ];
    const periodStart = new Date('2024-07-01');
    const periodEnd = new Date('2024-07-31');

    const metrics = calculatePropertyMetrics({
      bookings,
      periodStart,
      periodEnd,
      totalNightsInPeriod: 31,
    });

    expect(metrics.revenue).toBe(0);
    expect(metrics.nightsSold).toBe(0);
    expect(metrics.bookingCount).toBe(0);
  });

  it('handles partial overlaps with period boundaries', () => {
    const bookings = [
      { checkIn: new Date('2024-06-28'), checkOut: new Date('2024-07-04'), totalAmount: 500 }, // 3 nights in period (Jul 1, 2, 3)
    ];
    const periodStart = new Date('2024-07-01');
    const periodEnd = new Date('2024-07-31');

    const metrics = calculatePropertyMetrics({
      bookings,
      periodStart,
      periodEnd,
      totalNightsInPeriod: 31,
    });

    expect(metrics.nightsSold).toBe(3); // Jul 1, 2, 3
    expect(metrics.revenue).toBe(500);
  });
});
