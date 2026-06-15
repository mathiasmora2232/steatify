-- AlterTable
ALTER TABLE "steam_games" ADD COLUMN     "genres" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "genresAt" TIMESTAMP(3);

