"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamRepository = void 0;
const client_1 = __importDefault(require("../prisma/client"));
const client_2 = require("@prisma/client");
class TeamRepository {
    async findById(id) {
        return client_1.default.user.findFirst({
            where: {
                id,
                deletedAt: null,
            },
        });
    }
    async findByIdWithDetails(id) {
        return client_1.default.user.findFirst({
            where: {
                id,
                deletedAt: null,
            },
            include: {
                tasksAssigned: {
                    where: { isDeleted: false, deletedAt: null },
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                },
                activityLogs: {
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                },
            },
        });
    }
    async findByUsername(username) {
        return client_1.default.user.findFirst({
            where: {
                username: { equals: username, mode: 'insensitive' },
                deletedAt: null,
            },
        });
    }
    async findByEmail(email) {
        return client_1.default.user.findFirst({
            where: {
                email: { equals: email, mode: 'insensitive' },
                deletedAt: null,
            },
        });
    }
    async findNextEmployeeSeq() {
        const count = await client_1.default.user.count({
            where: { role: client_2.Role.employee },
        });
        return count + 1;
    }
    async findAll(filters) {
        const page = filters.page || 1;
        const limit = filters.limit || 10;
        const skip = (page - 1) * limit;
        const whereClause = {
            role: client_2.Role.employee,
            deletedAt: null,
        };
        if (filters.department) {
            whereClause.department = filters.department;
        }
        if (filters.designation) {
            whereClause.designation = filters.designation;
        }
        if (filters.isActive !== undefined) {
            whereClause.isActive = filters.isActive;
        }
        if (filters.startDate || filters.endDate) {
            whereClause.joinedDate = {};
            if (filters.startDate) {
                whereClause.joinedDate.gte = new Date(filters.startDate);
            }
            if (filters.endDate) {
                whereClause.joinedDate.lte = new Date(filters.endDate);
            }
        }
        if (filters.search) {
            const searchVal = filters.search.trim();
            whereClause.OR = [
                { name: { contains: searchVal, mode: 'insensitive' } },
                { username: { contains: searchVal, mode: 'insensitive' } },
                { email: { contains: searchVal, mode: 'insensitive' } },
                { phone: { contains: searchVal, mode: 'insensitive' } },
                { employeeId: { contains: searchVal, mode: 'insensitive' } },
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
        const [employees, total] = await Promise.all([
            client_1.default.user.findMany({
                where: whereClause,
                orderBy,
                skip,
                take: limit,
            }),
            client_1.default.user.count({
                where: whereClause,
            }),
        ]);
        return {
            employees,
            total,
            page,
            limit,
        };
    }
    async create(data) {
        return client_1.default.user.create({
            data,
        });
    }
    async update(id, data) {
        return client_1.default.user.update({
            where: { id },
            data,
        });
    }
    async softDelete(id, actorId) {
        return client_1.default.user.update({
            where: { id },
            data: {
                deletedAt: new Date(),
                deletedBy: actorId,
                isActive: false,
            },
        });
    }
    async getSummaryMetrics() {
        const baseWhere = { role: client_2.Role.employee, deletedAt: null };
        // Get total active employees
        const total = await client_1.default.user.count({
            where: baseWhere,
        });
        // Get active departments
        const activeDepts = await client_1.default.department.findMany({
            where: {
                isActive: true,
                deletedAt: null,
            },
            orderBy: [
                { displayOrder: 'asc' },
                { name: 'asc' },
            ],
        });
        // Count employees for each active department (handles both UUID and string name matching)
        const deptCounts = await Promise.all(activeDepts.map(async (dept) => {
            const count = await client_1.default.user.count({
                where: {
                    ...baseWhere,
                    OR: [
                        { departmentId: dept.id },
                        { department: { equals: dept.name, mode: 'insensitive' } }
                    ]
                },
            });
            return {
                name: dept.name,
                count,
            };
        }));
        return {
            total,
            departments: deptCounts,
        };
    }
}
exports.TeamRepository = TeamRepository;
