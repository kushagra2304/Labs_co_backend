"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmployeeTaskRepository = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const client_2 = require("@prisma/client");
class EmployeeTaskRepository {
    async findById(id) {
        return client_1.default.task.findFirst({
            where: {
                id,
                isDeleted: false,
                deletedAt: null,
            },
            include: {
                taskUpdates: {
                    orderBy: { createdAt: 'desc' },
                    include: {
                        updater: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                            },
                        },
                    },
                },
                assignee: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                assigner: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
    }
    async findAll(employeeId, filters) {
        // Base filter: Employee must be assignee for ADMIN_ASSIGNED, or creator for PERSONAL
        const whereClause = {
            isDeleted: false,
            deletedAt: null,
            OR: [
                { assignedTo: employeeId, taskType: client_2.TaskType.ADMIN_ASSIGNED },
                { createdBy: employeeId, taskType: client_2.TaskType.PERSONAL },
            ],
        };
        // Apply Filters
        if (filters.taskType) {
            whereClause.taskType = filters.taskType;
        }
        if (filters.status) {
            whereClause.status = filters.status;
        }
        if (filters.priority) {
            whereClause.priority = filters.priority;
        }
        if (filters.dueDate) {
            const d = new Date(filters.dueDate);
            const startOfDay = new Date(d.setHours(0, 0, 0, 0));
            const endOfDay = new Date(d.setHours(23, 59, 59, 999));
            whereClause.dueDate = {
                gte: startOfDay,
                lte: endOfDay,
            };
        }
        if (filters.search) {
            const searchVal = filters.search.trim();
            whereClause.AND = [
                {
                    OR: [
                        { title: { contains: searchVal, mode: 'insensitive' } },
                        { description: { contains: searchVal, mode: 'insensitive' } },
                    ],
                },
            ];
        }
        // Determine sorting
        let orderBy = { createdAt: 'desc' };
        if (filters.sortBy) {
            const order = filters.sortOrder || 'asc';
            orderBy = {
                [filters.sortBy]: order,
            };
        }
        return client_1.default.task.findMany({
            where: whereClause,
            orderBy,
            include: {
                assignee: { select: { id: true, name: true, email: true } },
                assigner: { select: { id: true, name: true, email: true } },
            },
        });
    }
    async createPersonal(data) {
        return client_1.default.task.create({
            data: {
                title: data.title,
                description: data.description,
                priority: data.priority,
                dueDate: data.dueDate,
                estimatedHours: data.estimatedHours,
                taskType: client_2.TaskType.PERSONAL,
                status: client_2.TaskStatus.pending,
                assignedTo: data.employeeId,
                createdBy: data.employeeId,
            },
        });
    }
    async updatePersonal(id, data) {
        return client_1.default.task.update({
            where: { id },
            data: {
                ...(data.title !== undefined && { title: data.title }),
                ...(data.description !== undefined && { description: data.description }),
                ...(data.priority !== undefined && { priority: data.priority }),
                ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
                ...(data.estimatedHours !== undefined && { estimatedHours: data.estimatedHours }),
                ...(data.status !== undefined && { status: data.status }),
                ...(data.completedAt !== undefined && { completedAt: data.completedAt }),
            },
        });
    }
    async softDeletePersonal(id, employeeId) {
        return client_1.default.task.update({
            where: { id },
            data: {
                isDeleted: true,
                deletedAt: new Date(),
                deletedBy: employeeId,
            },
        });
    }
    async updateStatus(id, status, completedAt) {
        return client_1.default.task.update({
            where: { id },
            data: {
                status,
                completedAt,
            },
        });
    }
    async createProgressUpdate(taskId, employeeId, note) {
        return client_1.default.taskUpdate.create({
            data: {
                taskId,
                updatedById: employeeId,
                note,
            },
            include: {
                updater: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });
    }
}
exports.EmployeeTaskRepository = EmployeeTaskRepository;
