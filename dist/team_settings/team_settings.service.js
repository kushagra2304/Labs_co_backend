"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MasterService = void 0;
const team_settings_repository_1 = require("./team_settings.repository");
class MasterService {
    modelName;
    repository;
    constructor(modelName) {
        this.modelName = modelName;
        this.repository = new team_settings_repository_1.MasterRepository(modelName);
    }
    async getItems(params) {
        return this.repository.findAll(params);
    }
    async getItemById(id) {
        const item = await this.repository.findById(id);
        if (!item) {
            throw new Error(`${this.modelName.charAt(0).toUpperCase() + this.modelName.slice(1)} not found`);
        }
        return item;
    }
    async createItem(data) {
        const trimmedName = data.name ? data.name.trim() : '';
        if (!trimmedName) {
            throw new Error('Name is required');
        }
        const existing = await this.repository.findByName(trimmedName);
        if (existing) {
            throw new Error(`${this.modelName.charAt(0).toUpperCase() + this.modelName.slice(1)} with name "${trimmedName}" already exists`);
        }
        return this.repository.create({
            ...data,
            name: trimmedName,
        });
    }
    async updateItem(id, data) {
        const existingItem = await this.repository.findById(id);
        if (!existingItem) {
            throw new Error(`${this.modelName.charAt(0).toUpperCase() + this.modelName.slice(1)} not found`);
        }
        if (data.name !== undefined) {
            const trimmedName = data.name ? data.name.trim() : '';
            if (!trimmedName) {
                throw new Error('Name is required');
            }
            if (trimmedName.toLowerCase() !== existingItem.name.toLowerCase()) {
                const existingWithName = await this.repository.findByName(trimmedName);
                if (existingWithName) {
                    throw new Error(`${this.modelName.charAt(0).toUpperCase() + this.modelName.slice(1)} with name "${trimmedName}" already exists`);
                }
            }
            data.name = trimmedName;
        }
        return this.repository.update(id, data);
    }
    async toggleStatus(id, isActive, actorId) {
        const existing = await this.repository.findById(id);
        if (!existing) {
            throw new Error(`${this.modelName.charAt(0).toUpperCase() + this.modelName.slice(1)} not found`);
        }
        return this.repository.update(id, {
            isActive,
            updatedBy: actorId,
        });
    }
    async deleteItem(id, actorId) {
        const existing = await this.repository.findById(id);
        if (!existing) {
            throw new Error(`${this.modelName.charAt(0).toUpperCase() + this.modelName.slice(1)} not found`);
        }
        return this.repository.softDelete(id, actorId);
    }
}
exports.MasterService = MasterService;
