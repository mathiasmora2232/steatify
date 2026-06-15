-- CreateTable
CREATE TABLE "steam_sync_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gamesReceived" INTEGER NOT NULL DEFAULT 0,
    "hoursBefore" INTEGER NOT NULL DEFAULT 0,
    "hoursAfter" INTEGER NOT NULL DEFAULT 0,
    "diffHours" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER NOT NULL DEFAULT 0,
    "full" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "steam_sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "steam_sync_logs_userId_createdAt_idx" ON "steam_sync_logs"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "steam_sync_logs" ADD CONSTRAINT "steam_sync_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

