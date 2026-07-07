/*
  Warnings:

  - A unique constraint covering the columns `[username]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[employee_id]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('ADMIN_ASSIGNED', 'PERSONAL');

-- AlterEnum
ALTER TYPE "Priority" ADD VALUE 'critical';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TaskStatus" ADD VALUE 'blocked';
ALTER TYPE "TaskStatus" ADD VALUE 'on_hold';

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN     "estimated_hours" INTEGER,
ADD COLUMN     "is_deleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "task_type" "TaskType" NOT NULL DEFAULT 'ADMIN_ASSIGNED';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "date_of_birth" TIMESTAMP(3),
ADD COLUMN     "employee_id" TEXT,
ADD COLUMN     "employment_type" TEXT,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "username" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_employee_id_key" ON "users"("employee_id");
