"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamSettingsController = void 0;
const team_settings_service_1 = require("./team_settings.service");
class TeamSettingsController {
    service;
    constructor(modelName) {
        this.service = new team_settings_service_1.MasterService(modelName);
    }
    list = async (req, res, next) => {
        try {
            const search = req.query.search;
            const isActive = req.query.isActive !== undefined ? req.query.isActive === 'true' : undefined;
            const page = req.query.page ? parseInt(req.query.page, 10) : undefined;
            const limit = req.query.limit ? parseInt(req.query.limit, 10) : undefined;
            const sortBy = req.query.sortBy;
            const sortOrder = req.query.sortOrder;
            const departmentId = req.query.departmentId;
            const result = await this.service.getItems({
                search,
                isActive,
                page,
                limit,
                sortBy,
                sortOrder,
                departmentId,
            });
            res.status(200).json({
                success: true,
                data: result.items,
                pagination: {
                    total: result.total,
                    page: page || 1,
                    limit: limit || 10,
                    totalPages: Math.ceil(result.total / (limit || 10)),
                },
            });
        }
        catch (error) {
            next(error);
        }
    };
    get = async (req, res, next) => {
        try {
            const id = req.params.id;
            const item = await this.service.getItemById(id);
            res.status(200).json({
                success: true,
                data: item,
            });
        }
        catch (error) {
            next(error);
        }
    };
    create = async (req, res, next) => {
        try {
            const actorId = req.user?.id || 'admin';
            const item = await this.service.createItem({
                ...req.body,
                createdBy: actorId,
            });
            res.status(201).json({
                success: true,
                data: item,
            });
        }
        catch (error) {
            next(error);
        }
    };
    update = async (req, res, next) => {
        try {
            const id = req.params.id;
            const actorId = req.user?.id || 'admin';
            const item = await this.service.updateItem(id, {
                ...req.body,
                updatedBy: actorId,
            });
            res.status(200).json({
                success: true,
                data: item,
            });
        }
        catch (error) {
            next(error);
        }
    };
    toggleStatus = async (req, res, next) => {
        try {
            const id = req.params.id;
            const { isActive } = req.body;
            const actorId = req.user?.id || 'admin';
            if (isActive === undefined) {
                throw new Error('isActive status is required');
            }
            const item = await this.service.toggleStatus(id, isActive, actorId);
            res.status(200).json({
                success: true,
                data: item,
            });
        }
        catch (error) {
            next(error);
        }
    };
    delete = async (req, res, next) => {
        try {
            const id = req.params.id;
            const actorId = req.user?.id || 'admin';
            const item = await this.service.deleteItem(id, actorId);
            res.status(200).json({
                success: true,
                message: 'Deleted successfully',
                data: item,
            });
        }
        catch (error) {
            next(error);
        }
    };
}
exports.TeamSettingsController = TeamSettingsController;
