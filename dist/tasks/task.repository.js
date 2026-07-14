"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskRepository = void 0;
const client_1 = __importDefault(require("../prisma/client"));
class TaskRepository {
    async findById(id) {
        return client_1.default.task.findFirst({
            where: {
                id,
                isDeleted: false,
                deletedAt: null,
            },
            include: {
                assignee: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        avatarUrl: true,
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
    async findAll(filters) {
        const page = filters.page || 1;
        const limit = filters.limit || 10;
        const skip = (page - 1) * limit;
        const whereClause = {
            isDeleted: false,
            deletedAt: null,
        };
        if (filters.employeeId) {
            whereClause.assignedTo = filters.employeeId;
        }
        if (filters.status) {
            whereClause.status = filters.status;
        }
        if (filters.priority) {
            whereClause.priority = filters.priority;
        }
        if (filters.startDate || filters.endDate) {
            whereClause.dueDate = {};
            if (filters.startDate) {
                whereClause.dueDate.gte = new Date(filters.startDate);
            }
            if (filters.endDate) {
                whereClause.dueDate.lte = new Date(filters.endDate);
            }
        }
        if (filters.search) {
            const searchVal = filters.search.trim();
            const orConditions = [
                { title: { contains: searchVal, mode: 'insensitive' } },
                {
                    assignee: {
                        name: { contains: searchVal, mode: 'insensitive' },
                    },
                },
                {
                    assignee: {
                        email: { contains: searchVal, mode: 'insensitive' },
                    },
                },
            ];
            // Check if search query is a valid UUID
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(searchVal);
            if (isUuid) {
                orConditions.push({ id: searchVal });
            }
            whereClause.OR = orConditions;
        }
        // Determine sorting
        let orderBy = { createdAt: 'desc' };
        if (filters.sortBy) {
            const order = filters.sortOrder || 'asc';
            if (filters.sortBy === 'assigneeName') {
                orderBy = {
                    assignee: {
                        name: order,
                    },
                };
            }
            else if (filters.sortBy === 'createdBy') {
                orderBy = {
                    assigner: {
                        name: order,
                    },
                };
            }
            else {
                orderBy = {
                    [filters.sortBy]: order,
                };
            }
        }
        const [tasks, total] = await Promise.all([
            client_1.default.task.findMany({
                where: whereClause,
                orderBy,
                skip,
                take: limit,
                include: {
                    assignee: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            avatarUrl: true,
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
            }),
            client_1.default.task.count({
                where: whereClause,
            }),
        ]);
        return {
            tasks: tasks,
            total,
            page,
            limit,
        };
    }
    async create(data) {
        return client_1.default.task.create({
            data: {
                title: data.title,
                description: data.description,
                assignedTo: data.assignedTo,
                priority: data.priority,
                status: data.status,
                dueDate: data.dueDate,
                estimatedHours: data.estimatedHours,
                assignedBy: data.actorId,
                createdBy: data.actorId,
            },
        });
    }
    async update(id, data) {
        return client_1.default.task.update({
            where: { id },
            data: {
                ...(data.title !== undefined && { title: data.title }),
                ...(data.description !== undefined && { description: data.description }),
                ...(data.assignedTo !== undefined && { assignedTo: data.assignedTo }),
                ...(data.priority !== undefined && { priority: data.priority }),
                ...(data.status !== undefined && { status: data.status }),
                ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
                ...(data.estimatedHours !== undefined && { estimatedHours: data.estimatedHours }),
                updatedBy: data.actorId,
            },
        });
    }
    async softDelete(id, actorId) {
        return client_1.default.task.update({
            where: { id },
            data: {
                isDeleted: true,
                deletedAt: new Date(),
                deletedBy: actorId,
            },
        });
    }
}
exports.TaskRepository = TaskRepository;
