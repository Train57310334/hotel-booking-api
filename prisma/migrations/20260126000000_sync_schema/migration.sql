-- AlterTable (User)
ALTER TABLE "User" ADD COLUMN "tags" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "User" ADD COLUMN "notes" TEXT;
ALTER TABLE "User" ADD COLUMN "preferences" TEXT;

-- AlterTable (Hotel)
ALTER TABLE "Hotel" ADD COLUMN "contactEmail" TEXT;
ALTER TABLE "Hotel" ADD COLUMN "contactPhone" TEXT;
ALTER TABLE "Hotel" ADD COLUMN "heroTitle" TEXT;
ALTER TABLE "Hotel" ADD COLUMN "heroDescription" TEXT;

-- AlterTable (RoomType)
ALTER TABLE "RoomType" ADD COLUMN "images" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "RoomType" ADD COLUMN "description" TEXT;
ALTER TABLE "RoomType" ADD COLUMN "basePrice" INTEGER;
ALTER TABLE "RoomType" ADD COLUMN "maxAdults" INTEGER NOT NULL DEFAULT 2;
ALTER TABLE "RoomType" ADD COLUMN "maxChildren" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "RoomType" ADD COLUMN "isFeatured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "RoomType" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "RoomType" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "RoomType" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- AlterTable (Room)
ALTER TABLE "Room" ADD COLUMN "roomNumber" TEXT;
ALTER TABLE "Room" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'unread',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'general',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'info',
    "userId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);
