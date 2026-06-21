-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('SCHEDULED', 'LIVE', 'ENDED');

-- AlterTable
ALTER TABLE "Room" ADD COLUMN     "commAudio" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "commChat" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "commVideo" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "contentTitle" TEXT,
ADD COLUMN     "coverUrl" TEXT,
ADD COLUMN     "inviteToken" TEXT,
ADD COLUMN     "scheduledAt" TIMESTAMP(3),
ADD COLUMN     "status" "RoomStatus" NOT NULL DEFAULT 'SCHEDULED';

-- CreateIndex
CREATE UNIQUE INDEX "Room_inviteToken_key" ON "Room"("inviteToken");

-- CreateIndex
CREATE INDEX "Room_status_idx" ON "Room"("status");

-- CreateIndex
CREATE INDEX "Room_scheduledAt_idx" ON "Room"("scheduledAt");
