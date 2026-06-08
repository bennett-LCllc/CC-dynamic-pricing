/**
 * Seed file — populates the database with sample data for development.
 *
 * Run with: npm run db:seed
 */

import { PrismaClient, Platform, BookingStatus, PropertyStatus } from '@prisma/client';
import { addDays, addHours } from 'date-fns';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean existing data
  await prisma.cleaningPhoto.deleteMany();
  await prisma.cleaningChecklist.deleteMany();
  await prisma.cleaningJob.deleteMany();
  await prisma.lawnPhoto.deleteMany();
  await prisma.lawnJob.deleteMany();
  await prisma.message.deleteMany();
  await prisma.pricingSnapshot.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.propertyPhoto.deleteMany();
  await prisma.property.deleteMany();
  await prisma.cleaner.deleteMany();
  await prisma.lawnCrew.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.expense.deleteMany();

  // ============================================================
  // Properties
  // ============================================================

  const property1 = await prisma.property.create({
    data: {
      name: 'Ocean Breeze Villa',
      slug: 'ocean-breeze-villa',
      address: '1234 Ocean Drive',
      zipCode: '78418',
      latitude: 27.7306,
      longitude: -97.3964,
      type: 'HOUSE',
      bedrooms: 3,
      bathrooms: 2,
      maxGuests: 8,
      squareFeet: 1450,
      yearBuilt: 2005,
      description: 'Beautiful 3BR beach house with Gulf views, steps from the sand.',
      amenities: ['WiFi', 'Pool', 'Hot Tub', 'Beach Access', 'BBQ Grill', 'Washer/Dryer', 'Smart TV'],
      baseRate: 175,
      cleaningFee: 150,
      petFee: 50,
      isPetFriendly: true,
      hasPool: true,
      hasHotTub: false,
      isBeachfront: false,
      status: 'ACTIVE',
      listingUrlAirbnb: 'https://airbnb.com/h/ocean-breeze-villa',
      listingUrlVrbo: 'https://vrbo.com/123456',
      photos: {
        create: [
          { url: '/photos/placeholder-exterior.jpg', caption: 'Front exterior', category: 'EXTERIOR', sortOrder: 0 },
          { url: '/photos/placeholder-living.jpg', caption: 'Living room', category: 'LIVING_ROOM', sortOrder: 1 },
          { url: '/photos/placeholder-kitchen.jpg', caption: 'Kitchen', category: 'KITCHEN', sortOrder: 2 },
          { url: '/photos/placeholder-bedroom.jpg', caption: 'Master bedroom', category: 'BEDROOM', sortOrder: 3 },
        ],
      },
    },
  });

  const property2 = await prisma.property.create({
    data: {
      name: 'Seaside Retreat',
      slug: 'seaside-retreat',
      address: '5678 Gulf Breeze Ave',
      zipCode: '78418',
      type: 'CONDO',
      bedrooms: 2,
      bathrooms: 2,
      maxGuests: 6,
      squareFeet: 1100,
      baseRate: 140,
      cleaningFee: 120,
      isPetFriendly: false,
      hasPool: false,
      isBeachfront: false,
      status: 'ACTIVE',
    },
  });

  // ============================================================
  // Bookings (sample data for the next 60 days)
  // ============================================================

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const bookings = [
    {
      propertyId: property1.id,
      platform: Platform.AIRBNB,
      platformBookingId: 'HA12345',
      guestName: 'Sarah Johnson',
      guestEmail: 'sarah.j@example.com',
      guestPhone: '+1-555-0101',
      guestCount: 4,
      checkIn: addDays(today, 2),
      checkOut: addDays(today, 5),
      nightlyRate: 185,
      totalNights: 3,
      subtotal: 555,
      cleaningFee: 150,
      platformFee: 22,
      totalAmount: 727,
      status: BookingStatus.CONFIRMED,
    },
    {
      propertyId: property1.id,
      platform: Platform.VRBO,
      platformBookingId: 'VR67890',
      guestName: 'Mike Chen',
      guestEmail: 'mike.chen@example.com',
      guestCount: 2,
      checkIn: addDays(today, 8),
      checkOut: addDays(today, 14),
      nightlyRate: 175,
      totalNights: 6,
      subtotal: 1050,
      cleaningFee: 150,
      platformFee: 60,
      totalAmount: 1260,
      status: BookingStatus.CONFIRMED,
    },
    {
      propertyId: property1.id,
      platform: Platform.AIRBNB,
      guestName: 'The Williams Family',
      guestEmail: 'williams@example.com',
      guestCount: 6,
      petCount: 1,
      checkIn: addDays(today, -5),
      checkOut: addDays(today, -1),
      nightlyRate: 200,
      totalNights: 4,
      subtotal: 800,
      cleaningFee: 150,
      petFee: 50,
      platformFee: 40,
      totalAmount: 1040,
      status: BookingStatus.COMPLETED,
    },
    {
      propertyId: property2.id,
      platform: Platform.DIRECT,
      guestName: 'Robert Martinez',
      guestEmail: 'r.martinez@example.com',
      guestCount: 2,
      checkIn: addDays(today, 1),
      checkOut: addDays(today, 4),
      nightlyRate: 140,
      totalNights: 3,
      subtotal: 420,
      cleaningFee: 120,
      platformFee: 15,
      totalAmount: 555,
      status: BookingStatus.ACTIVE,
    },
  ];

  for (const booking of bookings) {
    await prisma.booking.create({ data: booking });
  }

  // ============================================================
  // Cleaners
  // ============================================================

  const cleaner1 = await prisma.cleaner.create({
    data: {
      name: 'Maria Garcia',
      phone: '361-555-0201',
      email: 'maria@example.com',
      hourlyRate: 20,
      isActive: true,
    },
  });

  const cleaner2 = await prisma.cleaner.create({
    data: {
      name: 'James Wilson',
      phone: '361-555-0202',
      hourlyRate: 18,
      isActive: true,
    },
  });

  // ============================================================
  // Lawn Crew
  // ============================================================

  const crew1 = await prisma.lawnCrew.create({
    data: {
      name: 'Carlos Rodriguez',
      phone: '361-555-0301',
      hourlyRate: 18,
      isActive: true,
    },
  });

  // ============================================================
  // Cleaning Jobs
  // ============================================================

  // Completed cleaning for past booking
  await prisma.cleaningJob.create({
    data: {
      propertyId: property1.id,
      scheduledStart: addHours(addDays(today, -5), 11),
      scheduledEnd: addHours(addDays(today, -5), 14),
      actualStart: addHours(addDays(today, -5), 11),
      actualEnd: addHours(addDays(today, -5), 13),
      cleanerId: cleaner1.id,
      cleaningType: 'TURNOVER',
      status: 'COMPLETED',
      bedrooms: 3,
      bathrooms: 2,
      customerCharge: 150,
      laborCost: 60,
      supplyCost: 15,
      checklist: {
        create: {
          tasks: {
            kitchen: ['Clean counters', 'Wash dishes', 'Wipe appliances', 'Mop floor'],
            bathroom: ['Scrub shower', 'Clean toilet', 'Replace towels', 'Mirror'],
            bedroom: ['Change sheets', 'Vacuum', 'Dust', 'Check for items left behind'],
            general: ['Vacuum all floors', 'Check amenities', 'Restock supplies', 'Take photos'],
          },
          completedAt: addHours(addDays(today, -5), 13),
        },
      },
      photos: {
        create: [
          { url: '/photos/clean-kitchen.jpg', category: 'KITCHEN' },
          { url: '/photos/clean-bathroom.jpg', category: 'BATHROOM' },
          { url: '/photos/clean-bedroom.jpg', category: 'BEDROOM' },
        ],
      },
    },
  });

  // Upcoming cleaning for today's checkout
  await prisma.cleaningJob.create({
    data: {
      propertyId: property2.id,
      scheduledStart: addHours(today, 11),
      scheduledEnd: addHours(today, 14),
      cleanerId: cleaner2.id,
      cleaningType: 'TURNOVER',
      status: 'ASSIGNED',
      bedrooms: 2,
      bathrooms: 2,
      customerCharge: 120,
      laborCost: 54,
      supplyCost: 12,
    },
  });

  // ============================================================
  // Lawn Jobs
  // ============================================================

  await prisma.lawnJob.create({
    data: {
      propertyId: property1.id,
      scheduledDate: addDays(today, 0),
      scheduledTime: '08:00',
      completedAt: addHours(addDays(today, -1), 9),
      crewId: crew1.id,
      serviceType: 'MOW',
      status: 'COMPLETED',
      lotSize: 'QUARTER_ACRE',
      customerCharge: 80,
      laborCost: 36,
      materialCost: 5,
      photos: {
        create: [
          { url: '/photos/lawn-before.jpg', photoType: 'BEFORE' },
          { url: '/photos/lawn-after.jpg', photoType: 'AFTER' },
        ],
      },
    },
  });

  await prisma.lawnJob.create({
    data: {
      propertyId: property2.id,
      scheduledDate: addDays(today, 1),
      scheduledTime: '09:00',
      crewId: crew1.id,
      serviceType: 'MOW',
      status: 'SCHEDULED',
      lotSize: 'QUARTER_ACRE',
      customerCharge: 75,
      laborCost: 34,
      materialCost: 5,
    },
  });

  // ============================================================
  // Expenses (sample monthly expenses for property 1)
  // ============================================================

  const expenses = [
    { category: 'MORTGAGE', description: 'Monthly mortgage payment', amount: 1200, date: addDays(today, -15), isRecurring: true, recurringInterval: 'MONTHLY' },
    { category: 'INSURANCE', description: 'Property insurance', amount: 233, date: addDays(today, -10), isRecurring: true, recurringInterval: 'MONTHLY' },
    { category: 'UTILITIES', description: 'Electric bill', amount: 180, date: addDays(today, -5) },
    { category: 'INTERNET', description: 'WiFi service', amount: 75, date: addDays(today, -3), isRecurring: true, recurringInterval: 'MONTHLY' },
    { category: 'MAINTENANCE', description: 'Pool cleaning service', amount: 120, date: addDays(today, -7) },
    { category: 'SUPPLIES', description: 'Guest toiletries restock', amount: 45, date: addDays(today, -2) },
    { category: 'CLEANING_SUPPLIES', description: 'Cleaning chemicals + supplies', amount: 35, date: addDays(today, -1) },
  ];

  for (const exp of expenses) {
    await prisma.expense.create({
      data: {
        propertyId: property1.id,
        category: exp.category as any,
        description: exp.description,
        amount: exp.amount,
        date: exp.date,
        isRecurring: exp.isRecurring || false,
        recurringInterval: exp.recurringInterval as any,
        incurredBy: 'STR',
      },
    });
  }

  // ============================================================
  // Pricing Rules (sample)
  // ============================================================

  await prisma.pricingRule.create({
    data: {
      propertyId: property1.id,
      type: 'MIN_STAY',
      name: 'Weekend Minimum Stay',
      description: 'Require 2-night minimum on weekends',
      dayOfWeek: [4, 5, 6], // Thu, Fri, Sat
      minNights: 2,
      priority: 10,
      isActive: true,
    },
  });

  await prisma.pricingRule.create({
    data: {
      propertyId: property1.id,
      type: 'LAST_MINUTE',
      name: 'Last Minute Discount',
      description: '10% discount for bookings within 48 hours if property is empty',
      adjustmentType: 'PERCENTAGE',
      adjustmentValue: -10,
      priority: 5,
      isActive: true,
    },
  });

  console.log('✅ Seed complete!');
  console.log(`  Properties: 2 (${property1.name}, ${property2.name})`);
  console.log(`  Bookings: ${bookings.length}`);
  console.log(`  Cleaners: 2 (${cleaner1.name}, ${cleaner2.name})`);
  console.log(`  Lawn Crew: 1 (${crew1.name})`);
  console.log(`  Expenses: ${expenses.length} entries`);
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
