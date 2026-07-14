"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamController = void 0;
const team_service_1 = require("./team.service");
class TeamController {
    teamService;
    constructor(teamService = new team_service_1.TeamService()) {
        this.teamService = teamService;
    }
    listEmployees = async (req, res) => {
        try {
            const filters = {
                department: req.query.department ? String(req.query.department) : undefined,
                designation: req.query.designation ? String(req.query.designation) : undefined,
                isActive: req.query.isActive !== undefined
                    ? req.query.isActive === 'true'
                    : undefined,
                startDate: req.query.startDate ? String(req.query.startDate) : undefined,
                endDate: req.query.endDate ? String(req.query.endDate) : undefined,
                search: req.query.search ? String(req.query.search) : undefined,
                page: req.query.page ? parseInt(String(req.query.page), 10) : undefined,
                limit: req.query.limit ? parseInt(String(req.query.limit), 10) : undefined,
                sortBy: req.query.sortBy ? String(req.query.sortBy) : undefined,
                sortOrder: req.query.sortOrder === 'desc' ? 'desc' : 'asc',
            };
            const [result, metrics] = await Promise.all([
                this.teamService.getEmployees(filters),
                this.teamService.getSummaryMetrics(),
            ]);
            res.status(200).json({
                success: true,
                data: result.employees,
                pagination: {
                    total: result.total,
                    page: result.page,
                    limit: result.limit,
                    totalPages: Math.ceil(result.total / result.limit),
                },
                metrics,
            });
        }
        catch (error) {
            res.status(500).json({
                success: false,
                error: error.message || 'Failed to fetch team members',
            });
        }
    };
    getEmployee = async (req, res) => {
        try {
            const id = String(req.params.id);
            const employee = await this.teamService.getEmployeeById(id);
            res.status(200).json({
                success: true,
                data: employee,
            });
        }
        catch (error) {
            const status = error.message === 'Employee not found' ? 404 : 500;
            res.status(status).json({
                success: false,
                error: error.message || 'Failed to fetch employee details',
            });
        }
    };
    createEmployee = async (req, res) => {
        try {
            const actorId = req.user.id;
            const employee = await this.teamService.createEmployee(req.body, actorId);
            res.status(201).json({
                success: true,
                data: employee,
            });
        }
        catch (error) {
            res.status(400).json({
                success: false,
                error: error.message || 'Failed to add team member',
            });
        }
    };
    updateEmployee = async (req, res) => {
        try {
            const id = String(req.params.id);
            const actorId = req.user.id;
            const employee = await this.teamService.updateEmployee(id, req.body, actorId);
            res.status(200).json({
                success: true,
                data: employee,
            });
        }
        catch (error) {
            const status = error.message === 'Employee not found' ? 404 : 400;
            res.status(status).json({
                success: false,
                error: error.message || 'Failed to update team member details',
            });
        }
    };
    deleteEmployee = async (req, res) => {
        try {
            const id = String(req.params.id);
            const actorId = req.user.id;
            await this.teamService.softDeleteEmployee(id, actorId);
            res.status(200).json({
                success: true,
                message: 'Team member account deleted successfully',
            });
        }
        catch (error) {
            const status = error.message === 'Employee not found' ? 404 : 500;
            res.status(status).json({
                success: false,
                error: error.message || 'Failed to delete team member account',
            });
        }
    };
}
exports.TeamController = TeamController;
