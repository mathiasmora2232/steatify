-- AlterTable
ALTER TABLE "music_eras" ADD COLUMN     "badges" JSONB,
ADD COLUMN     "eraType" TEXT,
ADD COLUMN     "signals" JSONB,
ADD COLUMN     "topTracks" JSONB;

