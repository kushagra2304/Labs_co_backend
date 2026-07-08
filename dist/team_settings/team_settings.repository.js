"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MasterRepository = void 0;
const client_1 = __importDefault(require("../prisma/client"));
class MasterRepository {
    modelName;
    constructor(modelName) {
        this.modelName = modelName;
    }
    get delegate() {
        return client_1.default[this.modelName];
    }
    async findById(id) {
        return this.delegate.findFirst({
            where: {
                id,
                deletedAt: null,
            },
            ...(this.modelName === 'designation' ? { include: { department: true } } : {}),
        });
    }
    async findByName(name) {
        return this.delegate.findFirst({
            where: {
                name: { equals: name.trim(), mode: 'insensitive' },
                deletedAt: null,
            },
        });
    }
    async findAll(params) {
        const page = params.page || 1;
        const limit = params.limit || 10;
        const skip = (page - 1) * limit;
        const whereClause = {
            deletedAt: null,
        };
        if (params.isActive !== undefined) {
            whereClause.isActive = params.isActive;
        }
        if (params.search) {
            whereClause.name = {
                contains: params.search.trim(),
                mode: 'insensitive',
            };
        }
        if (params.departmentId !== undefined && params.departmentId !== '') {
            whereClause.departmentId = params.departmentId;
        }
        let orderBy = { displayOrder: 'asc' };
        if (params.sortBy) {
            orderBy = {
                [params.sortBy]: params.sortOrder || 'asc',
            };
        }
        const [items, total] = await Promise.all([
            this.delegate.findMany({
                where: whereClause,
                orderBy,
                skip,
                take: limit,
                ...(this.modelName === 'designation' ? { include: { department: true } } : {}),
            }),
            this.delegate.count({
                where: whereClause,
            }),
        ]);
        return { items, total };
    }
    async create(data) {
        return this.delegate.create({
            data,
        });
    }
    async update(id, data) {
        return this.delegate.update({
            where: { id },
            data,
            ...(this.modelName === 'designation' ? { include: { department: true } } : {}),
        });
    }
    async softDelete(id, actorId) {
        return this.delegate.update({
            where: { id },
            data: {
                deletedAt: new Date(),
                deletedBy: actorId,
                isActive: false,
            },
        });
    }
}
exports.MasterRepository = MasterRepository;
