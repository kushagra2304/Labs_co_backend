-- Project Files feature: R2 object key bookkeeping + 30-day auto-delete
-- lifecycle (expiresAt / keptAt / keptBy) on the existing generic File model.
-- Additive only: new nullable columns, no drops, no data loss.

-- AlterTable: files
ALTER TABLE "files" ADD COLUMN "r2_object_key" TEXT;
ALTER TABLE "files" ADD COLUMN "expires_at" TIMESTAMP(3);
ALTER TABLE "files" ADD COLUMN "kept_at" TIMESTAMP(3);
ALTER TABLE "files" ADD COLUMN "kept_by" UUID;

-- FK for kept_by -> users(id), matching the existing uploaded_by FK style.
ALTER TABLE "files" ADD CONSTRAINT "files_kept_by_fkey" FOREIGN KEY ("kept_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

