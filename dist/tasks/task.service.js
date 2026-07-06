"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskService = void 0;
const task_repository_1 = require("./task.repository");
const user_repository_1 = require("../helpers/user.repository");
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
    async createTask(data, actorId) {
        await this.validateTaskData(data);
        return this.taskRepo.create({
            title: data.title.trim(),
            description: data.description.trim(),
            assignedTo: data.assignedTo,
            priority: data.priority.toLowerCase(),
            status: data.status.toLowerCase(),
            dueDate: data.dueDate ? new Date(data.dueDate) : null,
            estimatedHours: data.estimatedHours !== undefined ? data.estimatedHours : null,
            actorId,
        });
    }
    async updateTask(id, data, actorId) {
        const existing = await this.taskRepo.findById(id);
        if (!existing) {
            throw new Error('Task not found');
        }
        await this.validateTaskData(data, true);
        return this.taskRepo.update(id, {
            ...(data.title !== undefined && { title: data.title.trim() }),
            ...(data.description !== undefined && { description: data.description.trim() }),
            ...(data.assignedTo !== undefined && { assignedTo: data.assignedTo }),
            ...(data.priority !== undefined && { priority: data.priority.toLowerCase() }),
            ...(data.status !== undefined && { status: data.status.toLowerCase() }),
            ...(data.dueDate !== undefined && { dueDate: data.dueDate ? new Date(data.dueDate) : null }),
            ...(data.estimatedHours !== undefined && { estimatedHours: data.estimatedHours }),
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
    async validateTaskData(data, isUpdate = false) {
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
        // Assignee validation
        if (!isUpdate || data.assignedTo !== undefined) {
            if (!data.assignedTo || typeof data.assignedTo !== 'string') {
                throw new Error('Assignee employee is required');
            }
            const employee = await this.userRepo.findById(data.assignedTo);
            if (!employee) {
                throw new Error('Assigned employee does not exist');
            }
            if (!employee.isActive || employee.deletedAt !== null) {
                throw new Error('Assigned employee must be an active, non-deleted user');
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
