"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRepository = void 0;
const client_1 = __importDefault(require("../prisma/client"));
class UserRepository {
    async findById(id, includeDeleted = false) {
        return client_1.default.user.findFirst({
            where: {
                id,
                ...(includeDeleted ? {} : { deletedAt: null }),
            },
        });
    }
    async findByEmail(email, includeDeleted = false) {
        return client_1.default.user.findFirst({
            where: {
                email,
                ...(includeDeleted ? {} : { deletedAt: null }),
            },
        });
    }
    async findAll(includeDeleted = false) {
        return client_1.default.user.findMany({
            where: includeDeleted ? {} : { deletedAt: null },
            orderBy: { name: 'asc' },
        });
    }
    async findActiveEmployeesExcept(currentUserId) {
        return client_1.default.user.findMany({
            where: {
                id: { not: currentUserId },
                isActive: true,
                deletedAt: null,
            },
            orderBy: { name: 'asc' },
        });
    }
    async findActiveEmployees() {
        return client_1.default.user.findMany({
            where: {
                isActive: true,
                deletedAt: null,
            },
            orderBy: { name: 'asc' },
        });
    }
    async create(data, actorId) {
        return client_1.default.user.create({
            data: {
                ...data,
                createdBy: actorId,
            },
        });
    }
    async update(id, data, actorId) {
        return client_1.default.user.update({
            where: { id },
            data: {
                ...data,
                updatedBy: actorId,
            },
        });
    }
    async softDelete(id, actorId) {
        return client_1.default.user.update({
            where: { id },
            data: {
                deletedAt: new Date(),
                deletedBy: actorId,
            },
        });
    }
}
exports.UserRepository = UserRepository;
