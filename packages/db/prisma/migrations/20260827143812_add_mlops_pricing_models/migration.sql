-- CreateEnum
CREATE TYPE "ModelStatus" AS ENUM ('STAGING', 'PRODUCTION', 'ARCHIVED', 'FAILED');

-- CreateEnum
CREATE TYPE "TrainingStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DataSource" AS ENUM ('ACTUAL', 'SYNTHETIC', 'AUGMENTED');

-- CreateEnum
CREATE TYPE "ExperimentStatus" AS ENUM ('DRAFT', 'RUNNING', 'PAUSED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('HOUSE', 'CONDO', 'TOWNHOUSE', 'DUPLEX', 'TRIPLEX', 'APARTMENT', 'CABIN');

-- CreateEnum
CREATE TYPE "PropertyStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'UNDER_RENOVATION', 'SOLD');

-- CreateEnum
CREATE TYPE "Platform" AS ENUM ('AIRBNB', 'VRBO', 'BOOKING_COM', 'DIRECT');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('INQUIRY', 'CONFIRMED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "BookingSource" AS ENUM ('AIRBNB', 'VRBO', 'BOOKING_COM', 'DIRECT', 'REFERRAL');

-- CreateEnum
CREATE TYPE "MessageDirection" AS ENUM ('INBOUND', 'OUTBOUND');

-- CreateEnum
CREATE TYPE "MessageChannel" AS ENUM ('AIRBNB', 'VRBO', 'SMS', 'EMAIL', 'PHONE');

-- CreateEnum
CREATE TYPE "PricingRuleType" AS ENUM ('SEASONAL', 'DAY_OF_WEEK', 'EVENT', 'MIN_STAY', 'LAST_MINUTE', 'EARLY_BIRD', 'CUSTOM');

-- CreateEnum
CREATE TYPE "AdjustmentType" AS ENUM ('PERCENTAGE', 'FIXED', 'FLAT_RATE');

-- CreateEnum
CREATE TYPE "PhotoCategory" AS ENUM ('EXTERIOR', 'INTERIOR', 'KITCHEN', 'BATHROOM', 'BEDROOM', 'LIVING_ROOM', 'POOL', 'YARD', 'DAMAGE', 'BEFORE_AFTER', 'OTHER');

-- CreateEnum
CREATE TYPE "CleaningType" AS ENUM ('TURNOVER', 'DEEP_CLEAN', 'MOVE_IN_OUT', 'MID_STAY', 'POST_CONSTRUCTION');

-- CreateEnum
CREATE TYPE "ServiceType" AS ENUM ('MOW', 'EDGE', 'TRIM', 'FERTILIZE', 'WEED_CONTROL', 'AERATE', 'OVERSEED', 'LEAF_REMOVAL', 'PRESSURE_WASH', 'FULL_SERVICE');

-- CreateEnum
CREATE TYPE "LotSize" AS ENUM ('EIGHTH_ACRE', 'QUARTER_ACRE', 'HALF_ACRE', 'ACRE', 'LARGE', 'COMMERCIAL');

-- CreateEnum
CREATE TYPE "LawnPhotoType" AS ENUM ('BEFORE', 'AFTER');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'SCHEDULED', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ISSUE_REPORTED', 'QUALITY_CHECK');

-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('STR_OWNER', 'PM_COMPANY', 'RESIDENTIAL', 'COMMERCIAL');

-- CreateEnum
CREATE TYPE "CustomerStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'CHURNED');

-- CreateEnum
CREATE TYPE "LawnPackage" AS ENUM ('BASIC', 'STANDARD', 'PREMIUM', 'SHOWCASE');

-- CreateEnum
CREATE TYPE "CleaningFrequency" AS ENUM ('PER_TURNOVER', 'WEEKLY', 'BIWEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('MORTGAGE', 'INSURANCE', 'PROPERTY_TAX', 'UTILITIES', 'INTERNET', 'WATER', 'ELECTRIC', 'GAS', 'TRASH', 'HOA', 'MAINTENANCE', 'REPAIRS', 'SUPPLIES', 'FURNISHING', 'LINENS', 'CLEANING_SUPPLIES', 'LAWN_SUPPLIES', 'EQUIPMENT', 'SOFTWARE', 'MARKETING', 'PLATFORM_FEES', 'LEGAL', 'ACCOUNTING', 'TRAVEL', 'FUEL', 'LABOR', 'OTHER');

-- CreateEnum
CREATE TYPE "RecurringInterval" AS ENUM ('WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUALLY');

-- CreateEnum
CREATE TYPE "LLC" AS ENUM ('STR', 'LAWN', 'CLEANING');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MANAGER', 'VIEWER');

-- CreateTable
CREATE TABLE "Property" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT 'Corpus Christi',
    "state" TEXT NOT NULL DEFAULT 'TX',
    "zipCode" TEXT NOT NULL,
    "latitude" DECIMAL(10,7),
    "longitude" DECIMAL(10,7),
    "type" "PropertyType" NOT NULL DEFAULT 'HOUSE',
    "bedrooms" INTEGER NOT NULL,
    "bathrooms" DECIMAL(3,1) NOT NULL DEFAULT 1,
    "maxGuests" INTEGER NOT NULL,
    "squareFeet" INTEGER,
    "lotSizeSqFt" INTEGER,
    "yearBuilt" INTEGER,
    "description" TEXT,
    "amenities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "baseRate" DECIMAL(8,2) NOT NULL,
    "cleaningFee" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "petFee" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "isPetFriendly" BOOLEAN NOT NULL DEFAULT false,
    "hasPool" BOOLEAN NOT NULL DEFAULT false,
    "hasHotTub" BOOLEAN NOT NULL DEFAULT false,
    "isBeachfront" BOOLEAN NOT NULL DEFAULT false,
    "status" "PropertyStatus" NOT NULL DEFAULT 'ACTIVE',
    "listingUrlAirbnb" TEXT,
    "listingUrlVrbo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Property_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PropertyPhoto" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "category" "PhotoCategory" NOT NULL DEFAULT 'EXTERIOR',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "platform" "Platform" NOT NULL,
    "platformBookingId" TEXT,
    "guestName" TEXT NOT NULL,
    "guestEmail" TEXT,
    "guestPhone" TEXT,
    "guestCount" INTEGER NOT NULL DEFAULT 1,
    "petCount" INTEGER NOT NULL DEFAULT 0,
    "checkIn" DATE NOT NULL,
    "checkOut" DATE NOT NULL,
    "checkInTime" TEXT NOT NULL DEFAULT '16:00',
    "checkoutTime" TEXT NOT NULL DEFAULT '11:00',
    "nightlyRate" DECIMAL(8,2) NOT NULL,
    "totalNights" INTEGER NOT NULL,
    "subtotal" DECIMAL(8,2) NOT NULL,
    "cleaningFee" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "petFee" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "platformFee" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(8,2) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'CONFIRMED',
    "source" "BookingSource" NOT NULL DEFAULT 'DIRECT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "direction" "MessageDirection" NOT NULL,
    "channel" "MessageChannel" NOT NULL DEFAULT 'AIRBNB',
    "content" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "templateId" TEXT,
    "automated" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MessageTemplate" (
    "id" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "channel" "MessageChannel" NOT NULL DEFAULT 'AIRBNB',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "variables" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingRule" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "type" "PricingRuleType" NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" DATE,
    "endDate" DATE,
    "dayOfWeek" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "minNights" INTEGER,
    "adjustmentType" "AdjustmentType" NOT NULL DEFAULT 'PERCENTAGE',
    "adjustmentValue" DECIMAL(6,2) NOT NULL DEFAULT 0,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingSnapshot" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "rate" DECIMAL(8,2) NOT NULL,
    "factors" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PricingSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MLModel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "framework" TEXT NOT NULL,
    "artifactPath" TEXT NOT NULL,
    "artifactHash" TEXT NOT NULL,
    "metrics" JSONB NOT NULL,
    "trainingDataHash" TEXT NOT NULL,
    "status" "ModelStatus" NOT NULL DEFAULT 'STAGING',
    "deployedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MLModel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MLTrainingRun" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "hyperparameters" JSONB NOT NULL,
    "trainDataStart" TIMESTAMP(3) NOT NULL,
    "trainDataEnd" TIMESTAMP(3) NOT NULL,
    "nExamples" INTEGER NOT NULL,
    "metrics" JSONB NOT NULL,
    "featureImportance" JSONB,
    "status" "TrainingStatus" NOT NULL DEFAULT 'RUNNING',
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "MLTrainingRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingTrainingExample" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT,
    "propertyId" TEXT NOT NULL,
    "propertyType" TEXT NOT NULL,
    "bedrooms" INTEGER NOT NULL,
    "baseRate" DECIMAL(8,2) NOT NULL,
    "stayDate" DATE NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "isHoliday" BOOLEAN NOT NULL DEFAULT false,
    "eventMultiplier" DECIMAL(4,2) NOT NULL DEFAULT 1.0,
    "occupancyRate14d" DECIMAL(4,2) NOT NULL,
    "competitorAvgRate" DECIMAL(8,2),
    "activeRules" JSONB,
    "wasBooked" BOOLEAN NOT NULL,
    "finalRate" DECIMAL(8,2),
    "revenue" DECIMAL(10,2),
    "dataSource" "DataSource" NOT NULL DEFAULT 'ACTUAL',
    "weight" DECIMAL(4,2) NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PricingTrainingExample_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingExperiment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "controlModelId" TEXT,
    "treatmentModelId" TEXT NOT NULL,
    "treatmentWeight" DECIMAL(3,2) NOT NULL DEFAULT 0.1,
    "propertyIds" TEXT[],
    "dateRangeStart" TIMESTAMP(3),
    "dateRangeEnd" TIMESTAMP(3),
    "status" "ExperimentStatus" NOT NULL DEFAULT 'DRAFT',
    "results" JSONB,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingExperiment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingFeedback" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "stayDate" DATE NOT NULL,
    "predictedRate" DECIMAL(8,2) NOT NULL,
    "predictedProb" DECIMAL(4,3) NOT NULL,
    "modelId" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "actualBooked" BOOLEAN,
    "actualRate" DECIMAL(8,2),
    "processedAt" TIMESTAMP(3),
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PricingFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Cleaner" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "hourlyRate" DECIMAL(6,2) NOT NULL DEFAULT 18,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cleaner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CleaningJob" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "bookingId" TEXT,
    "externalCustomerId" TEXT,
    "scheduledStart" TIMESTAMP(3) NOT NULL,
    "scheduledEnd" TIMESTAMP(3) NOT NULL,
    "actualStart" TIMESTAMP(3),
    "actualEnd" TIMESTAMP(3),
    "cleanerId" TEXT NOT NULL,
    "cleaningType" "CleaningType" NOT NULL DEFAULT 'TURNOVER',
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "bedrooms" INTEGER,
    "bathrooms" DECIMAL(3,1),
    "squareFeet" INTEGER,
    "customerCharge" DECIMAL(8,2) NOT NULL,
    "laborCost" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "supplyCost" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "travelCost" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "hostRating" INTEGER,
    "hostFeedback" TEXT,
    "issueReported" BOOLEAN NOT NULL DEFAULT false,
    "issueNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CleaningJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CleaningChecklist" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "tasks" JSONB NOT NULL,
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CleaningChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CleaningPhoto" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "category" "PhotoCategory" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CleaningPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LawnCrew" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "hourlyRate" DECIMAL(6,2) NOT NULL DEFAULT 16,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LawnCrew_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LawnJob" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "externalCustomerId" TEXT,
    "scheduledDate" DATE NOT NULL,
    "scheduledTime" TEXT,
    "completedAt" TIMESTAMP(3),
    "crewId" TEXT NOT NULL,
    "serviceType" "ServiceType" NOT NULL DEFAULT 'MOW',
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "lotSize" "LotSize" NOT NULL DEFAULT 'QUARTER_ACRE',
    "notes" TEXT,
    "customerCharge" DECIMAL(8,2) NOT NULL,
    "laborCost" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "materialCost" DECIMAL(8,2) NOT NULL DEFAULT 0,
    "hostFeedback" TEXT,
    "issueReported" BOOLEAN NOT NULL DEFAULT false,
    "issueNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LawnJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LawnPhoto" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "photoType" "LawnPhotoType" NOT NULL DEFAULT 'AFTER',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LawnPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT NOT NULL,
    "company" TEXT,
    "type" "CustomerType" NOT NULL DEFAULT 'STR_OWNER',
    "status" "CustomerStatus" NOT NULL DEFAULT 'ACTIVE',
    "stripeCustomerId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerProperty" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT,
    "address" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "propertyType" "PropertyType" NOT NULL DEFAULT 'HOUSE',
    "bedrooms" INTEGER,
    "bathrooms" DECIMAL(3,1),
    "squareFeet" INTEGER,
    "lotSize" "LotSize" NOT NULL DEFAULT 'QUARTER_ACRE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lawnPackage" "LawnPackage",
    "cleaningPackage" "CleaningFrequency",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerProperty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalLawnJob" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "propertyAddress" TEXT NOT NULL,
    "scheduledDate" DATE NOT NULL,
    "completedAt" TIMESTAMP(3),
    "crewId" TEXT,
    "serviceType" "ServiceType" NOT NULL DEFAULT 'MOW',
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "customerCharge" DECIMAL(8,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalLawnJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalCleaningJob" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "propertyAddress" TEXT NOT NULL,
    "scheduledStart" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "cleanerId" TEXT,
    "cleaningType" "CleaningType" NOT NULL DEFAULT 'TURNOVER',
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "customerCharge" DECIMAL(8,2) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalCleaningJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT,
    "category" "ExpenseCategory" NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "date" DATE NOT NULL,
    "incurredBy" "LLC" NOT NULL DEFAULT 'STR',
    "paidFrom" TEXT,
    "receiptUrl" TEXT,
    "vendor" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurringInterval" "RecurringInterval",
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "passwordHash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'ADMIN',
    "tokenVersion" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Property_slug_key" ON "Property"("slug");

-- CreateIndex
CREATE INDEX "Property_zipCode_idx" ON "Property"("zipCode");

-- CreateIndex
CREATE INDEX "Property_status_idx" ON "Property"("status");

-- CreateIndex
CREATE INDEX "Booking_propertyId_checkIn_checkOut_idx" ON "Booking"("propertyId", "checkIn", "checkOut");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- CreateIndex
CREATE INDEX "Booking_platformBookingId_idx" ON "Booking"("platformBookingId");

-- CreateIndex
CREATE INDEX "Message_bookingId_sentAt_idx" ON "Message"("bookingId", "sentAt");

-- CreateIndex
CREATE INDEX "MessageTemplate_trigger_idx" ON "MessageTemplate"("trigger");

-- CreateIndex
CREATE INDEX "PricingRule_propertyId_isActive_idx" ON "PricingRule"("propertyId", "isActive");

-- CreateIndex
CREATE INDEX "MLModel_name_version_idx" ON "MLModel"("name", "version");

-- CreateIndex
CREATE INDEX "MLModel_status_idx" ON "MLModel"("status");

-- CreateIndex
CREATE INDEX "MLTrainingRun_modelId_startedAt_idx" ON "MLTrainingRun"("modelId", "startedAt");

-- CreateIndex
CREATE INDEX "PricingTrainingExample_propertyId_stayDate_idx" ON "PricingTrainingExample"("propertyId", "stayDate");

-- CreateIndex
CREATE INDEX "PricingTrainingExample_wasBooked_idx" ON "PricingTrainingExample"("wasBooked");

-- CreateIndex
CREATE INDEX "PricingTrainingExample_dataSource_idx" ON "PricingTrainingExample"("dataSource");

-- CreateIndex
CREATE INDEX "PricingExperiment_status_idx" ON "PricingExperiment"("status");

-- CreateIndex
CREATE INDEX "PricingFeedback_modelId_processed_idx" ON "PricingFeedback"("modelId", "processed");

-- CreateIndex
CREATE INDEX "PricingFeedback_propertyId_stayDate_idx" ON "PricingFeedback"("propertyId", "stayDate");

-- CreateIndex
CREATE UNIQUE INDEX "PricingFeedback_propertyId_stayDate_modelId_modelVersion_key" ON "PricingFeedback"("propertyId", "stayDate", "modelId", "modelVersion");

-- CreateIndex
CREATE INDEX "CleaningJob_scheduledStart_status_idx" ON "CleaningJob"("scheduledStart", "status");

-- CreateIndex
CREATE INDEX "CleaningJob_cleanerId_scheduledStart_idx" ON "CleaningJob"("cleanerId", "scheduledStart");

-- CreateIndex
CREATE INDEX "CleaningJob_propertyId_idx" ON "CleaningJob"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "CleaningChecklist_jobId_key" ON "CleaningChecklist"("jobId");

-- CreateIndex
CREATE INDEX "LawnJob_scheduledDate_status_idx" ON "LawnJob"("scheduledDate", "status");

-- CreateIndex
CREATE INDEX "LawnJob_crewId_scheduledDate_idx" ON "LawnJob"("crewId", "scheduledDate");

-- CreateIndex
CREATE INDEX "LawnJob_propertyId_idx" ON "LawnJob"("propertyId");

-- CreateIndex
CREATE INDEX "Customer_type_status_idx" ON "Customer"("type", "status");

-- CreateIndex
CREATE INDEX "Expense_propertyId_date_idx" ON "Expense"("propertyId", "date");

-- CreateIndex
CREATE INDEX "Expense_category_idx" ON "Expense"("category");

-- CreateIndex
CREATE INDEX "Expense_incurredBy_idx" ON "Expense"("incurredBy");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Settings_key_key" ON "Settings"("key");

-- AddForeignKey
ALTER TABLE "PropertyPhoto" ADD CONSTRAINT "PropertyPhoto_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingRule" ADD CONSTRAINT "PricingRule_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingSnapshot" ADD CONSTRAINT "PricingSnapshot_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MLTrainingRun" ADD CONSTRAINT "MLTrainingRun_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "MLModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingTrainingExample" ADD CONSTRAINT "PricingTrainingExample_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingExperiment" ADD CONSTRAINT "PricingExperiment_controlModelId_fkey" FOREIGN KEY ("controlModelId") REFERENCES "MLModel"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingExperiment" ADD CONSTRAINT "PricingExperiment_treatmentModelId_fkey" FOREIGN KEY ("treatmentModelId") REFERENCES "MLModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleaningJob" ADD CONSTRAINT "CleaningJob_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleaningJob" ADD CONSTRAINT "CleaningJob_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleaningJob" ADD CONSTRAINT "CleaningJob_cleanerId_fkey" FOREIGN KEY ("cleanerId") REFERENCES "Cleaner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleaningChecklist" ADD CONSTRAINT "CleaningChecklist_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "CleaningJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleaningPhoto" ADD CONSTRAINT "CleaningPhoto_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "CleaningJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LawnJob" ADD CONSTRAINT "LawnJob_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LawnJob" ADD CONSTRAINT "LawnJob_crewId_fkey" FOREIGN KEY ("crewId") REFERENCES "LawnCrew"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LawnPhoto" ADD CONSTRAINT "LawnPhoto_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "LawnJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerProperty" ADD CONSTRAINT "CustomerProperty_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalLawnJob" ADD CONSTRAINT "ExternalLawnJob_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalCleaningJob" ADD CONSTRAINT "ExternalCleaningJob_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
