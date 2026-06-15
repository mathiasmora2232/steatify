-- CreateTable
CREATE TABLE "steam_accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "steamId" TEXT NOT NULL,
    "personaName" TEXT,
    "avatarUrl" TEXT,
    "profileUrl" TEXT,
    "country" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastSyncedAt" TIMESTAMP(3),

    CONSTRAINT "steam_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "steam_games" (
    "id" TEXT NOT NULL,
    "appId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "iconUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "steam_games_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_games" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "playtimeForever" INTEGER NOT NULL DEFAULT 0,
    "playtime2Weeks" INTEGER NOT NULL DEFAULT 0,
    "lastPlayedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_games_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "steam_accounts_userId_key" ON "steam_accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "steam_accounts_steamId_key" ON "steam_accounts"("steamId");

-- CreateIndex
CREATE UNIQUE INDEX "steam_games_appId_key" ON "steam_games"("appId");

-- CreateIndex
CREATE INDEX "steam_games_name_idx" ON "steam_games"("name");

-- CreateIndex
CREATE INDEX "user_games_userId_playtimeForever_idx" ON "user_games"("userId", "playtimeForever" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "user_games_userId_gameId_key" ON "user_games"("userId", "gameId");

-- AddForeignKey
ALTER TABLE "steam_accounts" ADD CONSTRAINT "steam_accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_games" ADD CONSTRAINT "user_games_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_games" ADD CONSTRAINT "user_games_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "steam_games"("id") ON DELETE CASCADE ON UPDATE CASCADE;
