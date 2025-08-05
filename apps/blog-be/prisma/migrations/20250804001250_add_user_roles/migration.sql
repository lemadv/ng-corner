/*
  Warnings:

  - You are about to drop the column `timezone` on the `users` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'AUTHOR', 'ADMIN');

-- AlterTable
ALTER TABLE "users" DROP COLUMN "timezone",
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'USER';
