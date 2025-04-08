-- AlterTable
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'pic';

-- AlterTable
ALTER TABLE "UserProfile" ADD COLUMN     "requestedRole" TEXT;
