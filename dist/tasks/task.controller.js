"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskController = void 0;
const task_service_1 = require("./task.service");
const notification_helper_1 = require("../helpers/notification.helper");
class TaskController {
    taskService;
    constructor(taskService = new task_service_1.TaskService()) {
        this.taskService = taskService;
    }
    listTasks = async (req, res) => {
        try {
            const filters = {
                employeeId: req.query.employeeId ? String(req.query.employeeId) : undefined,
                status: req.query.status ? String(req.query.status) : undefined,
                priority: req.query.priority ? String(req.query.priority) : undefined,
                startDate: req.query.startDate ? String(req.query.startDate) : undefined,
                endDate: req.query.endDate ? String(req.query.endDate) : undefined,
                search: req.query.search ? String(req.query.search) : undefined,
                page: req.query.page ? parseInt(String(req.query.page), 10) : undefined,
                limit: req.query.limit ? parseInt(String(req.query.limit), 10) : undefined,
                sortBy: req.query.sortBy ? String(req.query.sortBy) : undefined,
                sortOrder: req.query.sortOrder === 'desc' ? 'desc' : 'asc',
            };
            const result = await this.taskService.getTasks(filters);
            res.status(200).json({
                success: true,
                data: result.tasks,
                pagination: {
                    total: result.total,
                    page: result.page,
                    limit: result.limit,
                    totalPages: Math.ceil(result.total / result.limit),
                },
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to fetch tasks',
            });
        }
    };
    listDueSoon = async (req, res) => {
        try {
            const withinDays = req.query.withinDays ? parseInt(String(req.query.withinDays), 10) : 3;
            const tasks = await this.taskService.getDueSoonTasks(withinDays);
            res.status(200).json({
                success: true,
                data: tasks,
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to fetch due/overdue tasks',
            });
        }
    };
    getTask = async (req, res) => {
        try {
            const id = String(req.params.id);
            const task = await this.taskService.getTaskById(id);
            res.status(200).json({
                success: true,
                data: task,
            });
        }
        catch (error) {
            const status = error.message === 'Task not found' ? 404 : 500;
            res.status(status).json({
                success: false,
                error: error.message || 'Failed to fetch task',
            });
        }
    };
    createTask = async (req, res) => {
        try {
            const actorId = req.user.id;
            const { title, description, assignedTo, employeeIds, priority, status, dueDate, estimatedHours, projectId } = req.body;
            const parsedHours = estimatedHours !== undefined && estimatedHours !== null && estimatedHours !== ''
                ? Number(estimatedHours)
                : null;
            if (parsedHours !== null && isNaN(parsedHours)) {
                res.status(400).json({
                    success: false,
                    error: 'Estimated hours must be a valid number',
                });
                return;
            }
            const resolvedEmployeeIds = Array.isArray(employeeIds)
                ? employeeIds
                : (assignedTo ? [assignedTo] : []);
            const task = await this.taskService.createTask({
                title,
                description,
                employeeIds: resolvedEmployeeIds,
                priority,
                status,
                dueDate,
                estimatedHours: parsedHours,
                projectId: projectId || null,
            }, actorId);
            // Admin-assigned tasks need the employees to acknowledge them before
            // work can start — surface that via the notification bell.
            for (const empId of resolvedEmployeeIds) {
                await (0, notification_helper_1.publishActivity)({
                    userId: empId,
                    type: 'task_ack_required',
                    title: 'New task assigned',
                    body: `"${task.title}" was assigned to you and needs your acknowledgment before you can start.`,
                    relatedId: task.id,
                    relatedType: 'Task',
                    io: req.app.get('io'),
                });
            }
            res.status(201).json({
                success: true,
                data: task,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message || 'Failed to create task',
            });
        }
    };
    updateTask = async (req, res) => {
        try {
            const id = String(req.params.id);
            const actorId = req.user.id;
            const { title, description, assignedTo, employeeIds, priority, status, dueDate, estimatedHours, projectId } = req.body;
            const parsedHours = estimatedHours !== undefined && estimatedHours !== null && estimatedHours !== ''
                ? Number(estimatedHours)
                : null;
            if (parsedHours !== null && isNaN(parsedHours)) {
                res.status(400).json({
                    success: false,
                    error: 'Estimated hours must be a valid number',
                });
                return;
            }
            const resolvedEmployeeIds = employeeIds !== undefined
                ? (Array.isArray(employeeIds) ? employeeIds : (assignedTo ? [assignedTo] : []))
                : (assignedTo !== undefined ? [assignedTo] : undefined);
            const task = await this.taskService.updateTask(id, {
                title,
                description,
                employeeIds: resolvedEmployeeIds,
                priority,
                status,
                dueDate,
                estimatedHours: parsedHours,
                projectId: projectId !== undefined ? (projectId || null) : undefined,
            }, actorId);
            res.status(200).json({
                success: true,
                data: task,
            });
        }
        catch (error) {
            const status = error.message === 'Task not found' ? 404 : 400;
            res.status(status).json({
                success: false,
                error: error.message || 'Failed to update task',
            });
        }
    };
    deleteTask = async (req, res) => {
        try {
            const id = String(req.params.id);
            const actorId = req.user.id;
            await this.taskService.softDeleteTask(id, actorId);
            res.status(200).json({
                success: true,
                message: 'Task soft deleted successfully',
            });
        }
        catch (error) {
            const status = error.message === 'Task not found' ? 404 : 500;
            res.status(status).json({
                success: false,
                error: error.message || 'Failed to delete task',
            });
        }
    };
    finalizeTask = async (req, res) => {
        try {
            const id = String(req.params.id);
            const adminId = req.user.id;
            const task = await this.taskService.finalizeTask(id, adminId);
            if (task.assignedTo) {
                await (0, notification_helper_1.publishActivity)({
                    userId: task.assignedTo,
                    type: 'task_finalized',
                    title: 'Task finalized',
                    body: `"${task.title}" has been reviewed and marked fully complete by the admin.`,
                    relatedId: task.id,
                    relatedType: 'Task',
                    io: req.app.get('io'),
                });
            }
            res.status(200).json({
                success: true,
                data: task,
            });
        }
        catch (error) {
            const status = error.message === 'Task not found' ? 404 : 400;
            res.status(status).json({
                success: false,
                error: error.message || 'Failed to finalize task',
            });
        }
    };
}
exports.TaskController = TaskController;
