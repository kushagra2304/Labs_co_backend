-- Task acknowledgment + completion-file review workflow.
-- Additive only: new enum values, new nullable columns on "tasks", and a new
-- "task_submissions" table. Nothing existing is dropped or altered.

-- AlterEnum
ALTER TYPE "FileType" ADD VALUE 'dwg';

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'task_ack_required';
ALTER TYPE "NotificationType" ADD VALUE 'task_submission_review';
ALTER TYPE "NotificationType" ADD VALUE 'task_submission_result';
ALTER TYPE "NotificationType" ADD VALUE 'task_finalized';

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('pending', 'accepted', 'declined');

-- AlterTable
ALTER TABLE "tasks" ADD COLUMN "acknowledged_at" TIMESTAMP(3),
ADD COLUMN "admin_verified_at" TIMESTAMP(3),
ADD COLUMN "admin_verified_by" UUID;

-- CreateTable
CREATE TABLE "task_submissions" (
    "id" UUID NOT NULL,
    "task_id" UUID NOT NULL,
    "submitted_by" UUID NOT NULL,
    "file_id" UUID,
    "note" TEXT,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'pending',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMP(3),
    "admin_remarks" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "task_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "task_submissions_file_id_key" ON "task_submissions"("file_id");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_admin_verified_by_fkey" FOREIGN KEY ("admin_verified_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_submissions" ADD CONSTRAINT "task_submissions_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_submissions" ADD CONSTRAINT "task_submissions_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_submissions" ADD CONSTRAINT "task_submissions_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task_submissions" ADD CONSTRAINT "task_submissions_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE SET NULL ON UPDATE CASCADE;
