import { EmployeeTaskRepository, EmployeeTaskFilters } from './employee_task.repository';
import { Task, TaskStatus, Priority, TaskType, TaskUpdate, TaskSubmission, FileType } from '@prisma/client';

export class EmployeeTaskService {
  constructor(private employeeTaskRepo = new EmployeeTaskRepository()) {}

  async getTasks(employeeId: string, filters: EmployeeTaskFilters): Promise<Task[]> {
    return this.employeeTaskRepo.findAll(employeeId, filters);
  }

  async getTaskById(id: string, employeeId: string): Promise<Task & {
    taskUpdates: TaskUpdate[];
  }> {
    const task = await this.employeeTaskRepo.findById(id);
    if (!task) {
      throw new Error('Task not found');
    }

    // Verify permission: Employee must be assignee (for ADMIN_ASSIGNED) OR creator (for PERSONAL)
    const isAssignee = task.assignedTo === employeeId;
    const isCreator = task.createdBy === employeeId;

    if (!isAssignee && !isCreator) {
      throw new Error('Unauthorized: You do not have permission to view this task');
    }

    return task;
  }

  async createPersonalTask(
    data: {
      title: string;
      description: string;
      priority: string;
      dueDate: string | null;
      estimatedHours?: number | null;
    },
    employeeId: string
  ): Promise<Task> {
    this.validatePersonalTaskData(data);

    const task = await this.employeeTaskRepo.createPersonal({
      title: data.title.trim(),
      description: data.description.trim(),
      priority: data.priority.toLowerCase() as Priority,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      estimatedHours: data.estimatedHours !== undefined ? data.estimatedHours : null,
      employeeId,
    });

    // Create initial progress update
    await this.employeeTaskRepo.createProgressUpdate(task.id, employeeId, 'Personal task created.');

    return task;
  }

  async updatePersonalTask(
    id: string,
    data: {
      title?: string;
      description?: string;
      priority?: string;
      dueDate?: string | null;
      estimatedHours?: number | null;
      status?: string;
    },
    employeeId: string
  ): Promise<Task> {
    const task = await this.employeeTaskRepo.findById(id);
    if (!task) {
      throw new Error('Task not found');
    }

    if (task.taskType !== TaskType.PERSONAL || task.createdBy !== employeeId) {
      throw new Error('Unauthorized: You can only edit your own personal tasks');
    }

    this.validatePersonalTaskData(data, true);

    const isCompleted = data.status && data.status.toLowerCase() === 'completed';
    const completedAt = isCompleted ? new Date() : (data.status ? null : undefined);

    const updatedTask = await this.employeeTaskRepo.updatePersonal(id, {
      ...(data.title !== undefined && { title: data.title.trim() }),
      ...(data.description !== undefined && { description: data.description.trim() }),
      ...(data.priority !== undefined && { priority: data.priority.toLowerCase() as Priority }),
      ...(data.dueDate !== undefined && { dueDate: data.dueDate ? new Date(data.dueDate) : null }),
      ...(data.estimatedHours !== undefined && { estimatedHours: data.estimatedHours }),
      ...(data.status !== undefined && { status: data.status.toLowerCase() as TaskStatus }),
      ...(completedAt !== undefined && { completedAt }),
    });

    // Log update action in timeline
    let updateNotes = 'Task updated.';
    if (data.status && data.status.toLowerCase() !== task.status.toLowerCase()) {
      updateNotes = `Status updated to ${data.status.replace('_', ' ')}.`;
    }
    await this.employeeTaskRepo.createProgressUpdate(id, employeeId, updateNotes);

    return updatedTask;
  }

  async softDeletePersonalTask(id: string, employeeId: string): Promise<Task> {
    const task = await this.employeeTaskRepo.findById(id);
    if (!task) {
      throw new Error('Task not found');
    }

    if (task.taskType !== TaskType.PERSONAL || task.createdBy !== employeeId) {
      throw new Error('Unauthorized: You can only delete your own personal tasks');
    }

    return this.employeeTaskRepo.softDeletePersonal(id, employeeId);
  }

  async updateTaskStatus(id: string, status: string, employeeId: string): Promise<Task> {
    const task = await this.employeeTaskRepo.findById(id);
    if (!task) {
      throw new Error('Task not found');
    }

    // Verify assignee
    if (task.assignedTo !== employeeId && task.createdBy !== employeeId) {
      throw new Error('Unauthorized: You are not authorized to update this task status');
    }

    // Admin-assigned tasks are gated behind acknowledgment, and completion for
    // them must go through the file-review submission flow rather than this
    // generic status setter. Personal tasks are untouched by either rule.
    if (task.taskType === TaskType.ADMIN_ASSIGNED) {
      if (!task.acknowledgedAt) {
        throw new Error('Task must be acknowledged before it can be started or updated');
      }
      if (status.toLowerCase() === 'completed') {
        throw new Error('Use the completion submission endpoint with a file attachment to complete this task');
      }
    }

    const validStatuses = ['pending', 'in_progress', 'on_hold', 'completed'];
    if (!validStatuses.includes(status.toLowerCase())) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }

    const isCompleted = status.toLowerCase() === 'completed';
    const completedAt = isCompleted ? new Date() : null;

    const updatedTask = await this.employeeTaskRepo.updateStatus(
      id,
      status.toLowerCase() as TaskStatus,
      completedAt
    );

    // Log status change in task updates timeline
    await this.employeeTaskRepo.createProgressUpdate(
      id,
      employeeId,
      `Status changed to ${status.replace('_', ' ')}.`
    );

    return updatedTask;
  }

  async addTaskProgress(id: string, note: string, employeeId: string): Promise<TaskUpdate> {
    const task = await this.employeeTaskRepo.findById(id);
    if (!task) {
      throw new Error('Task not found');
    }

    // Verify permission
    if (task.assignedTo !== employeeId && task.createdBy !== employeeId) {
      throw new Error('Unauthorized: You are not authorized to add progress updates to this task');
    }

    if (!note || typeof note !== 'string' || !note.trim()) {
      throw new Error('Progress update message is required');
    }

    return this.employeeTaskRepo.createProgressUpdate(id, employeeId, note.trim());
  }

  private validatePersonalTaskData(
    data: {
      title?: string;
      description?: string;
      priority?: string;
      dueDate?: string | null;
    },
    isUpdate = false
  ): void {
    // Title validation
    if (!isUpdate || data.title !== undefined) {
      if (!data.title || typeof data.title !== 'string' || !data.title.trim()) {
        throw new Error('Task title is required');
      }
    }

    // Description validation
    if (!isUpdate || data.description !== undefined) {
      if (!data.description || typeof data.description !== 'string' || !data.description.trim()) {
        throw new Error('Task description is required');
      }
    }

    // Priority validation
    if (!isUpdate || data.priority !== undefined) {
      if (!data.priority || typeof data.priority !== 'string') {
        throw new Error('Priority is required');
      }
      const validPriorities = ['low', 'medium', 'high', 'critical'];
      if (!validPriorities.includes(data.priority.toLowerCase())) {
        throw new Error(`Priority must be one of: ${validPriorities.join(', ')}`);
      }
    }

    // Due Date validation
    if (!isUpdate || data.dueDate !== undefined) {
      if (data.dueDate !== undefined && data.dueDate !== null) {
        const date = new Date(data.dueDate);
        if (isNaN(date.getTime())) {
          throw new Error('Due date must be a valid date');
        }
      }
    }
  }

  // ── Acknowledgment gate ─────────────────────────────────────────────────

  async acknowledgeTask(id: string, employeeId: string): Promise<Task> {
    const task = await this.employeeTaskRepo.findById(id);
    if (!task) {
      throw new Error('Task not found');
    }
    if (task.assignedTo !== employeeId) {
      throw new Error('Unauthorized: You are not authorized to acknowledge this task');
    }
    if (task.taskType !== TaskType.ADMIN_ASSIGNED) {
      throw new Error('Only admin-assigned tasks require acknowledgment');
    }
    if (task.acknowledgedAt) {
      // Already acknowledged — idempotent no-op so double clicks don't error.
      return task;
    }

    const updated = await this.employeeTaskRepo.acknowledge(id);
    await this.employeeTaskRepo.createProgressUpdate(id, employeeId, 'Task acknowledged.');
    return updated;
  }

  async getPendingAcknowledgment(employeeId: string): Promise<Task[]> {
    return this.employeeTaskRepo.findPendingAcknowledgment(employeeId);
  }

  // ── Completion submission (file review workflow) ────────────────────────

  async submitCompletion(
    id: string,
    employeeId: string,
    file: { fileName: string; fileUrl: string; fileType: FileType; sizeKb: number | null },
    note: string | null
  ): Promise<TaskSubmission> {
    const task = await this.employeeTaskRepo.findById(id);
    if (!task) {
      throw new Error('Task not found');
    }
    if (task.assignedTo !== employeeId) {
      throw new Error('Unauthorized: You are not authorized to submit this task');
    }
    if (task.taskType !== TaskType.ADMIN_ASSIGNED) {
      throw new Error('Personal tasks do not require a completion submission');
    }
    if (!task.acknowledgedAt) {
      throw new Error('Task must be acknowledged before it can be completed');
    }

    const latest = await this.employeeTaskRepo.getLatestSubmission(id);
    if (latest && latest.status === 'pending') {
      throw new Error('A submission is already awaiting admin review for this task');
    }

    const fileRecord = await this.employeeTaskRepo.createCompletionFile({
      taskId: id,
      uploadedBy: employeeId,
      name: file.fileName,
      fileUrl: file.fileUrl,
      fileType: file.fileType,
      sizeKb: file.sizeKb,
    });

    const submission = await this.employeeTaskRepo.createSubmission({
      taskId: id,
      submittedBy: employeeId,
      fileId: fileRecord.id,
      note,
    });

    // Task is marked completed by the employee's declaration; it stays
    // "completed" even if this particular file later gets declined — the
    // admin reviews the file separately and finalizes the task separately.
    await this.employeeTaskRepo.markCompleted(id);
    await this.employeeTaskRepo.createProgressUpdate(
      id,
      employeeId,
      latest
        ? 'Resubmitted a completion file for admin review.'
        : 'Marked completed and submitted a file for admin review.'
    );

    return submission;
  }
}
