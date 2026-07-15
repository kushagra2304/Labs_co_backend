"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TaskRepository = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const client_2 = require("@prisma/client");
class TaskRepository {
    async findById(id) {
        const task = await client_1.default.task.findFirst({
            where: {
                id,
                isDeleted: false,
                deletedAt: null,
            },
            include: {
                assigner: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                project: {
                    select: {
                        id: true,
                        name: true,
                        client: true,
                    },
                },
                assignments: {
                    include: {
                        employee: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                avatarUrl: true,
                            },
                        },
                    },
                },
            },
        });
        if (!task)
            return null;
        const assignees = (task.assignments ?? []).map((a) => a.employee);
        return {
            ...task,
            assignees,
            assignee: assignees.length > 0 ? assignees[0] : null,
        };
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
                    assigner: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    project: {
                        select: {
                            id: true,
                            name: true,
                            client: true,
                        },
                    },
                    assignments: {
                        include: {
                            employee: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true,
                                    avatarUrl: true,
                                },
                            },
                        },
                    },
                },
            }),
            client_1.default.task.count({
                where: whereClause,
            }),
        ]);
        const mappedTasks = tasks.map((t) => {
            const assignees = (t.assignments ?? []).map((a) => a.employee);
            return {
                ...t,
                assignees,
                assignee: assignees.length > 0 ? assignees[0] : null,
            };
        });
        return {
            tasks: mappedTasks,
            total,
            page,
            limit,
        };
    }
    async create(data) {
        const task = await client_1.default.task.create({
            data: {
                title: data.title,
                description: data.description,
                assignedTo: data.assignedTo,
                priority: data.priority,
                status: data.status,
                dueDate: data.dueDate,
                estimatedHours: data.estimatedHours,
                projectId: data.projectId,
                assignedBy: data.actorId,
                createdBy: data.actorId,
            },
        });
        if (data.employeeIds && data.employeeIds.length > 0) {
            await client_1.default.taskAssignment.createMany({
                data: data.employeeIds.map((empId) => ({
                    taskId: task.id,
                    employeeId: empId,
                    assignedBy: data.actorId,
                })),
            });
        }
        return task;
    }
    async update(id, data) {
        const task = await client_1.default.task.update({
            where: { id },
            data: {
                ...(data.title !== undefined && { title: data.title }),
                ...(data.description !== undefined && { description: data.description }),
                ...(data.assignedTo !== undefined && { assignedTo: data.assignedTo }),
                ...(data.priority !== undefined && { priority: data.priority }),
                ...(data.status !== undefined && { status: data.status }),
                ...(data.dueDate !== undefined && { dueDate: data.dueDate }),
                ...(data.estimatedHours !== undefined && { estimatedHours: data.estimatedHours }),
                ...(data.dueSoonNotifiedAt !== undefined && { dueSoonNotifiedAt: data.dueSoonNotifiedAt }),
                ...(data.overdueNotifiedAt !== undefined && { overdueNotifiedAt: data.overdueNotifiedAt }),
                ...(data.projectId !== undefined && { projectId: data.projectId }),
                updatedBy: data.actorId,
            },
        });
        if (data.employeeIds !== undefined) {
            await client_1.default.taskAssignment.deleteMany({
                where: { taskId: id },
            });
            if (data.employeeIds.length > 0) {
                await client_1.default.taskAssignment.createMany({
                    data: data.employeeIds.map((empId) => ({
                        taskId: id,
                        employeeId: empId,
                        assignedBy: data.actorId,
                    })),
                });
            }
        }
        return task;
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
    async getLatestSubmission(taskId) {
        return client_1.default.taskSubmission.findFirst({
            where: { taskId, deletedAt: null },
            orderBy: { createdAt: 'desc' },
        });
    }
    async finalize(id, adminId) {
        return client_1.default.task.update({
            where: { id },
            data: {
                adminVerifiedAt: new Date(),
                adminVerifiedBy: adminId,
            },
        });
    }
    // Tasks due within the next few days, or already past their due date, that
    // aren't finished yet — surfaced on the admin "Due / Overdue" tab so admins
    // can see at a glance who needs a nudge and who's already late.
    async findDueSoon(withinDays) {
        const horizon = new Date();
        horizon.setHours(23, 59, 59, 999);
        horizon.setDate(horizon.getDate() + withinDays);
        const tasks = await client_1.default.task.findMany({
            where: {
                isDeleted: false,
                deletedAt: null,
                status: { notIn: [client_2.TaskStatus.completed] },
                dueDate: { not: null, lte: horizon },
            },
            orderBy: { dueDate: 'asc' },
            include: {
                assigner: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                project: {
                    select: {
                        id: true,
                        name: true,
                        client: true,
                    },
                },
                assignments: {
                    include: {
                        employee: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                avatarUrl: true,
                            },
                        },
                    },
                },
            },
        });
        return tasks.map((t) => {
            const assignees = (t.assignments ?? []).map((a) => a.employee);
            return {
                ...t,
                assignees,
                assignee: assignees.length > 0 ? assignees[0] : null,
            };
        });
    }
}
exports.TaskRepository = TaskRepository;
