-- CreateTable
CREATE TABLE "steam_snapshots" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "totalMinutes" INTEGER NOT NULL,
    "gameCount" INTEGER NOT NULL,
    "playedCount" INTEGER NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "steam_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "steam_snapshots_userId_capturedAt_idx" ON "steam_snapshots"("userId", "capturedAt");

-- AddForeignKey
ALTER TABLE "steam_snapshots" ADD CONSTRAINT "steam_snapshots_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

