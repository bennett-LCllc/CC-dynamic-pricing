-- CreateTable
CREATE TABLE "MarketSnapshot" (
    "id" TEXT NOT NULL,
    "locationKey" TEXT NOT NULL,
    "monthRangeStart" TEXT NOT NULL,
    "monthRangeEnd" TEXT NOT NULL,
    "adr" DECIMAL(8,2) NOT NULL,
    "occupancyRate" DECIMAL(4,2) NOT NULL,
    "revpar" DECIMAL(8,2) NOT NULL,
    "demand" DECIMAL(6,2) NOT NULL,
    "numMonths" INTEGER NOT NULL DEFAULT 1,
    "source" TEXT NOT NULL DEFAULT 'AIRDNA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateUniqueIndex
CREATE UNIQUE INDEX "MarketSnapshot_locationKey_monthRangeStart_monthRangeEnd_key" ON "MarketSnapshot"("locationKey", "monthRangeStart", "monthRangeEnd");

-- CreateIndex
CREATE INDEX "MarketSnapshot_locationKey_idx" ON "MarketSnapshot"("locationKey");
