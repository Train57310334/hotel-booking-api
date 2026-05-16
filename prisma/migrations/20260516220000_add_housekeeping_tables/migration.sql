-- ============================================================================
-- Migration: Add all missing tables and columns since sync_schema
-- This migration is SAFE to run on databases that already have some of these
-- via `prisma db push`. Each statement uses IF NOT EXISTS.
-- ============================================================================

-- ─── ENUMS ──────────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "RoomStatus" AS ENUM ('CLEAN', 'DIRTY', 'CLEANING', 'INSPECTED', 'OOO', 'OCCUPIED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ─── NEW TABLES ─────────────────────────────────────────────────────────────

-- RoomStatusLog
CREATE TABLE IF NOT EXISTS "RoomStatusLog" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "status" "RoomStatus" NOT NULL,
    "updatedBy" TEXT,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomStatusLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "RoomStatusLog_roomId_idx" ON "RoomStatusLog"("roomId");

-- MaintenanceReport
CREATE TABLE IF NOT EXISTS "MaintenanceReport" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "reportedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintenanceReport_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MaintenanceReport_roomId_idx" ON "MaintenanceReport"("roomId");

-- DailyStat
CREATE TABLE IF NOT EXISTS "DailyStat" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "totalRevenue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalBookings" INTEGER NOT NULL DEFAULT 0,
    "occupiedRooms" INTEGER NOT NULL DEFAULT 0,
    "occupancyRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "adr" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "revPar" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DailyStat_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "DailyStat_date_key" ON "DailyStat"("date");

-- Guest
CREATE TABLE IF NOT EXISTS "Guest" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "idType" TEXT NOT NULL DEFAULT 'passport',
    "idNumber" TEXT,
    "documentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Guest_pkey" PRIMARY KEY ("id")
);

-- SubscriptionPayment
CREATE TABLE IF NOT EXISTS "SubscriptionPayment" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'THB',
    "plan" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'success',
    "provider" TEXT NOT NULL DEFAULT 'stripe',
    "chargeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionPayment_pkey" PRIMARY KEY ("id")
);

-- FolioCharge
CREATE TABLE IF NOT EXISTS "FolioCharge" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'OTHER',
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FolioCharge_pkey" PRIMARY KEY ("id")
);

-- MessageReply
CREATE TABLE IF NOT EXISTS "MessageReply" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "staffName" TEXT NOT NULL DEFAULT 'Hotel Staff',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageReply_pkey" PRIMARY KEY ("id")
);

-- Expense
CREATE TABLE IF NOT EXISTS "Expense" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- SubscriptionPlan
CREATE TABLE IF NOT EXISTS "SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "priceLabel" TEXT NOT NULL DEFAULT 'Free',
    "period" TEXT NOT NULL DEFAULT '/month',
    "description" TEXT,
    "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "missingFeatures" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isPopular" BOOLEAN NOT NULL DEFAULT false,
    "color" TEXT NOT NULL DEFAULT 'emerald',
    "icon" TEXT NOT NULL DEFAULT 'Zap',
    "maxRooms" INTEGER NOT NULL DEFAULT 2,
    "maxRoomTypes" INTEGER NOT NULL DEFAULT 1,
    "maxStaff" INTEGER NOT NULL DEFAULT 1,
    "hasPromotions" BOOLEAN NOT NULL DEFAULT false,
    "hasOnlinePayment" BOOLEAN NOT NULL DEFAULT false,
    "hasSeo" BOOLEAN NOT NULL DEFAULT false,
    "hasCustomDomain" BOOLEAN NOT NULL DEFAULT false,
    "hasAdvancedAnalytics" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "SubscriptionPlan_name_key" ON "SubscriptionPlan"("name");

-- BookingDraft
CREATE TABLE IF NOT EXISTS "BookingDraft" (
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingDraft_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "BookingDraft_expiresAt_idx" ON "BookingDraft"("expiresAt");

-- YieldRule
CREATE TABLE IF NOT EXISTS "YieldRule" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "triggerType" TEXT NOT NULL,
    "conditionOp" TEXT NOT NULL,
    "conditionValue" INTEGER NOT NULL,
    "adjustmentType" TEXT NOT NULL,
    "adjustmentOp" TEXT NOT NULL,
    "adjustmentValue" DOUBLE PRECISION NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "YieldRule_pkey" PRIMARY KEY ("id")
);

-- ActivityLog
CREATE TABLE IF NOT EXISTS "ActivityLog" (
    "id" TEXT NOT NULL,
    "hotelId" TEXT NOT NULL,
    "userId" TEXT,
    "userName" TEXT,
    "userEmail" TEXT,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ActivityLog_hotelId_idx" ON "ActivityLog"("hotelId");
CREATE INDEX IF NOT EXISTS "ActivityLog_userId_idx" ON "ActivityLog"("userId");
CREATE INDEX IF NOT EXISTS "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

-- ─── ALTER EXISTING TABLES (add missing columns) ────────────────────────────

-- Room: add status column (was TEXT, now enum)
DO $$ BEGIN
  ALTER TABLE "Room" ADD COLUMN "status" "RoomStatus" NOT NULL DEFAULT 'CLEAN';
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Hotel: add missing columns
DO $$ BEGIN ALTER TABLE "Hotel" ADD COLUMN "logoUrl" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Hotel" ADD COLUMN "footerDescription" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Hotel" ADD COLUMN "facebookUrl" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Hotel" ADD COLUMN "instagramUrl" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Hotel" ADD COLUMN "twitterUrl" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Hotel" ADD COLUMN "heroVideoUrl" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Hotel" ADD COLUMN "checkInTime" TEXT DEFAULT '14:00'; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Hotel" ADD COLUMN "checkOutTime" TEXT DEFAULT '12:00'; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Hotel" ADD COLUMN "promptPayId" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Hotel" ADD COLUMN "bankName" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Hotel" ADD COLUMN "bankAccountName" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Hotel" ADD COLUMN "bankAccountNumber" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Hotel" ADD COLUMN "theme" TEXT DEFAULT 'classic'; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Hotel" ADD COLUMN "isSuspended" BOOLEAN NOT NULL DEFAULT false; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Hotel" ADD COLUMN "subscriptionTier" TEXT NOT NULL DEFAULT 'FREE'; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Hotel" ADD COLUMN "subscriptionExpiresAt" TIMESTAMP(3); EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Hotel" ADD COLUMN "stripeCustomerId" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Hotel" ADD COLUMN "hasOnlinePayment" BOOLEAN NOT NULL DEFAULT false; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Hotel" ADD COLUMN "seoTitle" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Hotel" ADD COLUMN "seoDescription" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Hotel" ADD COLUMN "seoKeywords" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Hotel" ADD COLUMN "ogImage" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Hotel" ADD COLUMN "canonicalUrl" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Hotel" ADD COLUMN "customDomain" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Hotel" ADD COLUMN "robotsIndex" BOOLEAN NOT NULL DEFAULT true; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Hotel" ADD COLUMN "googleAnalyticsId" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Hotel" ADD COLUMN "googleTagManagerId" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Hotel" ADD COLUMN "facebookPixelId" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Hotel" ADD COLUMN "googleAdsId" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Hotel" ADD COLUMN "analyticsEmbedUrl" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Booking: add missing columns
DO $$ BEGIN ALTER TABLE "Booking" ADD COLUMN "source" TEXT DEFAULT 'direct'; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Booking" ADD COLUMN "channelName" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Booking" ADD COLUMN "otaReferenceId" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Booking" ADD COLUMN "notes" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Booking" ADD COLUMN "isWebCheckedIn" BOOLEAN NOT NULL DEFAULT false; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Booking" ADD COLUMN "signatureUrl" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Booking" ADD COLUMN "estimatedArrivalTime" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Booking" ADD COLUMN "reviewToken" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Booking" ADD COLUMN "reviewTokenUsed" BOOLEAN NOT NULL DEFAULT false; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Booking" ADD COLUMN "roomId" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
CREATE UNIQUE INDEX IF NOT EXISTS "Booking_reviewToken_key" ON "Booking"("reviewToken");

-- Payment: add missing columns
DO $$ BEGIN ALTER TABLE "Payment" ADD COLUMN "method" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Review: add missing columns
DO $$ BEGIN ALTER TABLE "Review" ADD COLUMN "guestName" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Review" ADD COLUMN "source" TEXT NOT NULL DEFAULT 'direct'; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Message: add missing columns
DO $$ BEGIN ALTER TABLE "Message" ADD COLUMN "hotelId" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Message" ADD COLUMN "archivedAt" TIMESTAMP(3); EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Notification: add hotelId
DO $$ BEGIN ALTER TABLE "Notification" ADD COLUMN "hotelId" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- RatePlan: add missing columns
DO $$ BEGIN ALTER TABLE "RatePlan" ADD COLUMN "breakfastPrice" INTEGER NOT NULL DEFAULT 0; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "RatePlan" ADD COLUMN "channelManagerRateId" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- Promotion: add missing columns
DO $$ BEGIN ALTER TABLE "Promotion" ADD COLUMN "hotelId" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Promotion" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Promotion" ADD COLUMN "maxUses" INTEGER; EXCEPTION WHEN duplicate_column THEN NULL; END $$;
DO $$ BEGIN ALTER TABLE "Promotion" ADD COLUMN "usedCount" INTEGER NOT NULL DEFAULT 0; EXCEPTION WHEN duplicate_column THEN NULL; END $$;

-- ─── FOREIGN KEYS (add if missing) ──────────────────────────────────────────

DO $$ BEGIN
  ALTER TABLE "RoomStatusLog" ADD CONSTRAINT "RoomStatusLog_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "RoomStatusLog" ADD CONSTRAINT "RoomStatusLog_updatedBy_fkey" FOREIGN KEY ("updatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "MaintenanceReport" ADD CONSTRAINT "MaintenanceReport_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Guest" ADD CONSTRAINT "Guest_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "SubscriptionPayment" ADD CONSTRAINT "SubscriptionPayment_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "FolioCharge" ADD CONSTRAINT "FolioCharge_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "MessageReply" ADD CONSTRAINT "MessageReply_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Expense" ADD CONSTRAINT "Expense_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "YieldRule" ADD CONSTRAINT "YieldRule_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Booking" ADD CONSTRAINT "Booking_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "Room"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Promotion" ADD CONSTRAINT "Promotion_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE "Message" ADD CONSTRAINT "Message_hotelId_fkey" FOREIGN KEY ("hotelId") REFERENCES "Hotel"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
