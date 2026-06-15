-- CreateTable
CREATE TABLE "steam_game_snapshots" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "appId" INTEGER NOT NULL,
    "playtimeForever" INTEGER NOT NULL,
    "playtime2Weeks" INTEGER NOT NULL DEFAULT 0,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "steam_game_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "steam_game_snapshots_userId_appId_capturedAt_idx" ON "steam_game_snapshots"("userId", "appId", "capturedAt");

-- CreateIndex
CREATE INDEX "steam_game_snapshots_userId_capturedAt_idx" ON "steam_game_snapshots"("userId", "capturedAt");

-- AddForeignKey
ALTER TABLE "steam_game_snapshots" ADD CONSTRAINT "steam_game_snapshots_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

