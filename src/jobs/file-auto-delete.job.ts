import { ProjectFilesRepository } from '../project_files/project_files.repository';
import { ProjectFileStorageService } from '../project_files/project-file-storage.service';

const repo = new ProjectFilesRepository();
const storage = new ProjectFileStorageService();

/**
 * Project files auto-expire 30 days after upload (see
 * ProjectFilesRepository.FILE_LIFESPAN_DAYS). The Files page surfaces a
 * review banner for the last 5 days of that window (see REVIEW_WINDOW_DAYS)
 * so an admin can keep or delete before this job runs. Anything still
 * carrying a past-due `expiresAt` gets removed here: the R2 object is
 * deleted, then the DB row is soft-deleted.
 *
 * Safe to call repeatedly — once a file's `expiresAt` has passed and it's
 * been processed, its `deletedAt` is set so it no longer matches
 * findExpired() on subsequent runs.
 */
export async function runFileAutoDeleteCheck(): Promise<void> {
  try {
    const expired = await repo.findExpired();
    if (expired.length === 0) return;

    let deleted = 0;
    for (const file of expired) {
      try {
        if (file.r2ObjectKey) {
          await storage.deleteObject(file.r2ObjectKey);
        }
        await repo.softDelete(file.id);
        deleted++;
      } catch (err) {
        console.error(`Failed to auto-delete file ${file.id} (${file.name}):`, err);
      }
    }

    if (deleted > 0) {
      console.log(`File auto-delete job: removed ${deleted} file(s) past their 30-day expiry.`);
    }
  } catch (error) {
    console.error('File auto-delete job failed:', error);
  }
}
