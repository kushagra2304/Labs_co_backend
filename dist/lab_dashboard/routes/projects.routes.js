"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const require_auth_middleware_1 = require("../../lab_auth/middleware/require-auth.middleware");
const project_controller_1 = require("../controllers/project.controller");
const router = (0, express_1.Router)();
const projectController = new project_controller_1.ProjectController();
// Secure all routes with auth
router.use(require_auth_middleware_1.requireAuth);
router.get('/', projectController.listProjects);
router.get('/:id', projectController.getProject);
router.post('/', projectController.createProject);
router.patch('/:id', projectController.updateProject);
router.delete('/:id', projectController.deleteProject);
exports.default = router;
