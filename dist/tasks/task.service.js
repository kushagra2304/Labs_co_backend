"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskService = void 0;
const task_repository_1 = require("./task.repository");
const user_repository_1 = require("../helpers/user.repository");
const client_1 = __importDefault(require("../prisma/client"));
class TaskService {
    taskRepo;
    userRepo;
    constructor(taskRepo = new task_repository_1.TaskRepository(), userRepo = new user_repository_1.UserRepository()) {
        this.taskRepo = taskRepo;
        this.userRepo = userRepo;
    }
    async getTasks(filters) {
        return this.taskRepo.findAll(filters);
    }
    async getTaskById(id) {
        const task = await this.taskRepo.findById(id);
        if (!task) {
            throw new Error('Task not found');
        }
        return task;
    }
    // Tasks due within the next few days (default 3), or already overdue,
    // that aren't completed yet — feeds the admin "Due / Overdue" tab.
    async getDueSoonTasks(withinDays = 3) {
        return this.taskRepo.findDueSoon(withinDays);
    }
    async createTask(data, actorId) {
        await this.validateTaskData(data);
        // Maintain legacy assignedTo field in the DB as the first element of employeeIds
        const assignedTo = data.employeeIds[0] || '';
        return this.taskRepo.create({
            title: data.title.trim(),
            description: data.description.trim(),
            assignedTo,
            priority: data.priority.toLowerCase(),
            status: data.status.toLowerCase(),
            dueDate: data.dueDate ? new Date(data.dueDate) : null,
            estimatedHours: data.estimatedHours !== undefined ? data.estimatedHours : null,
            projectId: data.projectId,
            employeeIds: data.employeeIds,
            actorId,
        });
    }
    async updateTask(id, data, actorId) {
        const existing = await this.taskRepo.findById(id);
        if (!existing) {
            throw new Error('Task not found');
        }
        await this.validateTaskData(data, true, existing);
        // A due-date change invalidates any previous "due soon" reminder — reset
        // it so the deadline job can notify again if the new date re-enters the
        // reminder window.
        const dueDateChanged = data.dueDate !== undefined;
        // Maintain legacy assignedTo field in the DB as the first element of employeeIds
        const assignedTo = data.employeeIds !== undefined
            ? (data.employeeIds[0] || null)
            : undefined;
        return this.taskRepo.update(id, {
            ...(data.title !== undefined && { title: data.title.trim() }),
            ...(data.description !== undefined && { description: data.description.trim() }),
            ...(assignedTo !== undefined && { assignedTo: assignedTo || undefined }),
            ...(data.priority !== undefined && { priority: data.priority.toLowerCase() }),
            ...(data.status !== undefined && { status: data.status.toLowerCase() }),
            ...(data.dueDate !== undefined && { dueDate: data.dueDate ? new Date(data.dueDate) : null }),
            ...(data.estimatedHours !== undefined && { estimatedHours: data.estimatedHours }),
            ...(dueDateChanged && { dueSoonNotifiedAt: null, overdueNotifiedAt: null }),
            ...(data.projectId !== undefined && { projectId: data.projectId }),
            ...(data.employeeIds !== undefined && { employeeIds: data.employeeIds }),
            actorId,
        });
    }
    async softDeleteTask(id, actorId) {
        const existing = await this.taskRepo.findById(id);
        if (!existing) {
            throw new Error('Task not found');
        }
        return this.taskRepo.softDelete(id, actorId);
    }
    // Final admin sign-off. Deliberately separate from the employee marking a
    // task "completed" and from a submitted file being accepted: an accepted
    // file does not by itself close out the task, the admin must finalize it.
    async finalizeTask(id, adminId) {
        const task = await this.taskRepo.findById(id);
        if (!task) {
            throw new Error('Task not found');
        }
        if (task.adminVerifiedAt) {
            throw new Error('Task is already finalized');
        }
        const latestSubmission = await this.taskRepo.getLatestSubmission(id);
        if (!latestSubmission || latestSubmission.status !== 'accepted') {
            throw new Error('Task can only be finalized after its submitted file has been accepted');
        }
        return this.taskRepo.finalize(id, adminId);
    }
    async validateTaskData(data, isUpdate = false, existing = null) {
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
        // Employee IDs validation (many-to-many)
        const targetEmployeeIds = data.employeeIds !== undefined
            ? data.employeeIds
            : (isUpdate && existing ? (existing.assignees?.map((a) => a.id) || []) : undefined);
        if (!isUpdate || data.employeeIds !== undefined) {
            if (!data.employeeIds || !Array.isArray(data.employeeIds) || data.employeeIds.length === 0) {
                throw new Error('At least one assigned employee is required');
            }
            for (const employeeId of data.employeeIds) {
                if (typeof employeeId !== 'string') {
                    throw new Error('Employee ID must be a string');
                }
                const employee = await this.userRepo.findById(employeeId);
                if (!employee) {
                    throw new Error(`Assigned employee with ID ${employeeId} does not exist`);
                }
                if (!employee.isActive || employee.deletedAt !== null) {
                    throw new Error(`Assigned employee ${employee.name} must be an active, non-deleted user`);
                }
            }
        }
        // Project and Member validation
        const targetProjectId = data.projectId !== undefined ? data.projectId : (isUpdate && existing ? existing.projectId : undefined);
        if (targetProjectId) {
            // Validate project exists
            const project = await client_1.default.project.findFirst({
                where: { id: targetProjectId, deletedAt: null }
            });
            if (!project) {
                throw new Error('Selected project does not exist');
            }
            // Validate that EVERY assigned employee belongs to the project
            if (targetEmployeeIds) {
                for (const employeeId of targetEmployeeIds) {
                    const isMember = await client_1.default.projectMember.findFirst({
                        where: {
                            projectId: targetProjectId,
                            userId: employeeId,
                            deletedAt: null,
                        }
                    });
                    if (!isMember) {
                        const employee = await this.userRepo.findById(employeeId);
                        throw new Error(`Assigned employee ${employee?.name || employeeId} is not a member of the selected project`);
                    }
                }
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
        // Status validation
        if (!isUpdate || data.status !== undefined) {
            if (!data.status || typeof data.status !== 'string') {
                throw new Error('Status is required');
            }
            const validStatuses = ['pending', 'in_progress', 'completed', 'blocked', 'overdue'];
            if (!validStatuses.includes(data.status.toLowerCase())) {
                throw new Error(`Status must be one of: ${validStatuses.join(', ')}`);
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
            else if (!isUpdate) {
                throw new Error('Due date is required');
            }
        }
    }
}
exports.TaskService = TaskService;
