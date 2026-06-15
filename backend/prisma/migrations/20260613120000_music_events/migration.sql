-- CreateTable
CREATE TABLE "music_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "entityType" TEXT NOT NULL DEFAULT 'track',
    "entityId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "imageUrl" TEXT,
    "dedupeKey" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "music_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "music_events_userId_createdAt_idx" ON "music_events"("userId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "music_events_userId_dedupeKey_key" ON "music_events"("userId", "dedupeKey");

-- AddForeignKey
ALTER TABLE "music_events" ADD CONSTRAINT "music_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

