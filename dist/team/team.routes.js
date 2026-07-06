"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const require_auth_middleware_1 = require("../lab_auth/middleware/require-auth.middleware");
const team_controller_1 = require("./team.controller");
const router = (0, express_1.Router)();
const teamController = new team_controller_1.TeamController();
// Require authenticated user AND role = admin for all team management endpoints
router.use(require_auth_middleware_1.requireAuth);
router.use((0, require_auth_middleware_1.requireRole)(['admin']));
router.get('/', teamController.listEmployees);
router.get('/:id', teamController.getEmployee);
router.post('/', teamController.createEmployee);
router.put('/:id', teamController.updateEmployee);
router.delete('/:id', teamController.deleteEmployee);
exports.default = router;
