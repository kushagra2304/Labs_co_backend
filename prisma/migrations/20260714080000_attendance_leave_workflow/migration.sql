-- Attendance workflow changes: monthly paid-leave quota, request type
-- (LEAVE vs REMOTE), paid/unpaid flag on leave attendance records, and
-- removing the default weekend/Sunday day-off (every day is now a working
-- day unless the employee uses one of their monthly leaves or it's a
-- configured holiday).
-- Additive only: new nullable/defaulted columns, no drops.

-- AlterTable: attendances
ALTER TABLE "attendances" ADD COLUMN "is_paid_leave" BOOLEAN;

-- AlterTable: attendance_requests
ALTER TABLE "attendance_requests" ADD COLUMN "request_type" TEXT NOT NULL DEFAULT 'REMOTE';

-- AlterTable: attendance_policies
ALTER TABLE "attendance_policies" ALTER COLUMN "working_days" SET DEFAULT '1,2,3,4,5,6,7';
ALTER TABLE "attendance_policies" ADD COLUMN "monthly_leave_quota" INTEGER NOT NULL DEFAULT 4;

-- Data fix-up: any existing policy row(s) should also stop treating
-- weekends as off by default, per the new no-weekends-off rule.
UPDATE "attendance_policies" SET "working_days" = '1,2,3,4,5,6,7';
