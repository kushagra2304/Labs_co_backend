"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskController = void 0;
const task_service_1 = require("./task.service");
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
            const { title, description, assignedTo, priority, status, dueDate, estimatedHours } = req.body;
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
            const task = await this.taskService.createTask({
                title,
                description,
                assignedTo,
                priority,
                status,
                dueDate,
                estimatedHours: parsedHours,
            }, actorId);
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
            const { title, description, assignedTo, priority, status, dueDate, estimatedHours } = req.body;
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
            const task = await this.taskService.updateTask(id, {
                title,
                description,
                assignedTo,
                priority,
                status,
                dueDate,
                estimatedHours: parsedHours,
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
}
exports.TaskController = TaskController;
