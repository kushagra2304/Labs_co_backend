-- Deadline reminder notifications (due-soon + auto overdue).
-- Additive only: new enum values and two new nullable columns on "tasks".

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'task_due_soon';
ALTER TYPE "NotificationType" ADD VALUE 'task_overdue';

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN "due_soon_notified_at" TIMESTAMP(3),
ADD COLUMN "overdue_notified_at" TIMESTAMP(3);
