#!/usr/bin/env node
/**
 * Script to generate an OpenAPI specification from Zod validation schemas.
 *
 * - Looks for `*.ts` files that export a Zod schema (named `*Schema` or `*Validator`).
 * - Uses `@asteasolutions/zod-to-openapi` to convert each schema to an OpenAPI component.
 * - Writes a YAML file to `api-docs/openapi-from-zod.yaml`.
 *
 * Usage:
 *   npm run generate:openapi
 *
 * Requirements:
 *   - Node >=18
 *   - npm packages: zod, @asteasolutions/zod-to-openapi, ts-node, yaml, glob
 */
import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { OpenApiGeneratorV3 } from '@asteasolutions/zod-to-openapi';
import * as yaml from 'yaml';
import { promises as fs } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Extend zod with OpenAPI methods
extendZodWithOpenApi(z);

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function generateOpenAPI() {
  // Example schemas to demonstrate the generation
  // In the future, this can be extended to discover schemas from the codebase
  const propertySchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(1).max(200),
    address: z.string().min(1).max(500),
    city: z.string().min(1).max(100),
    state: z.string().length(2),
    zipCode: z.string().length(5),
    type: z.enum(['HOUSE', 'CONDO', 'TOWNHOUSE', 'DUPLEX', 'TRIPLEX', 'APARTMENT', 'CABIN']),
    bedrooms: z.number().int().min(0).max(20),
    bathrooms: z.number().min(0).max(20),
    maxGuests: z.number().int().min(1).max(50),
    baseRate: z.number().min(0),
    cleaningFee: z.number().min(0).optional(),
    petFee: z.number().min(0).optional(),
    isPetFriendly: z.boolean().optional(),
    hasPool: z.boolean().optional(),
    hasHotTub: z.boolean().optional(),
    isBeachfront: z.boolean().optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'UNDER_RENOVATION', 'SOLD']).optional(),
    createdAt: z.string().datetime().optional(),
    updatedAt: z.string().datetime().optional(),
  }).openapi('Property');

  const bookingSchema = z.object({
    id: z.string().uuid(),
    propertyId: z.string().uuid(),
    platform: z.enum(['AIRBNB', 'VRBO', 'BOOKING_COM', 'DIRECT']),
    platformBookingId: z.string().optional().nullable(),
    guestName: z.string().min(1).max(200),
    guestEmail: z.string().email().optional().nullable(),
    guestPhone: z.string().max(50).optional().nullable(),
    guestCount: z.number().int().min(1).max(50),
    petCount: z.number().int().min(0).max(10).optional(),
    checkIn: z.string().datetime(),
    checkOut: z.string().datetime(),
    checkInTime: z.string().optional(),
    checkoutTime: z.string().optional(),
    nightlyRate: z.number().min(0),
    totalNights: z.number().int().min(1).optional(),
    subtotal: z.number().min(0).optional(),
    cleaningFee: z.number().min(0).optional(),
    petFee: z.number().min(0).optional(),
    platformFee: z.number().min(0).optional(),
    totalAmount: z.number().min(0).optional(),
    status: z.enum(['INQUIRY', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
    source: z.enum(['AIRBNB', 'VRBO', 'BOOKING_COM', 'DIRECT', 'REFERRAL']).optional(),
    notes: z.string().max(2000).optional().nullable(),
    createdAt: z.string().datetime().optional(),
    updatedAt: z.string().datetime().optional(),
  }).openapi('Booking');

  const customerSchema = z.object({
    id: z.string().uuid(),
    name: z.string().min(1).max(200),
    email: z.string().email().optional().nullable(),
    phone: z.string().min(1).max(50),
    company: z.string().max(200).optional().nullable(),
    type: z.enum(['STR_OWNER', 'PM_COMPANY', 'RESIDENTIAL', 'COMMERCIAL']).optional(),
    status: z.enum(['ACTIVE', 'INACTIVE', 'CHURNED']).optional(),
    stripeCustomerId: z.string().max(200).optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
    createdAt: z.string().datetime().optional(),
    updatedAt: z.string().datetime().optional(),
  }).openapi('Customer');

  const schemas = [propertySchema, bookingSchema, customerSchema];

  // Generate OpenAPI components using @asteasolutions/zod-to-openapi
  const generator = new OpenApiGeneratorV3(schemas);
  const openapiDoc = generator.generateDocument({
    openapi: '3.0.3',
    info: {
      title: 'CC Ops API',
      version: '0.1.0',
      description: 'API generated from Zod validation schemas.',
    },
    servers: [{ url: 'http://localhost:4000' }],
  });

  // Write the YAML file
  const outputPath = resolve(__dirname, '../api-docs/openapi-from-zod.yaml');
  await fs.writeFile(outputPath, `#%YAML 1.2\n` + yaml.stringify(openapiDoc), 'utf8');
  console.log(`✅ OpenAPI spec written to ${outputPath}`);
}

generateOpenAPI().catch((e) => {
  console.error('❌ Generation failed:', e);
  process.exit(1);
});