-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN', 'SUPER_ADMIN');
CREATE TYPE "Plan" AS ENUM ('FREE', 'PLUS', 'PRO');

-- AlterTable
ALTER TABLE "users" ADD COLUMN "role" "Role" NOT NULL DEFAULT 'USER';
ALTER TABLE "users" ADD COLUMN "plan" "Plan" NOT NULL DEFAULT 'FREE';
ALTER TABLE "users" ADD COLUMN "planRenewsAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "suspendedAt" TIMESTAMP(3);

-- Bootstrap the founding super admin
UPDATE "users" SET "role" = 'SUPER_ADMIN' WHERE "username" = 'mathias555';
