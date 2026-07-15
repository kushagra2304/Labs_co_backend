"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const require_auth_middleware_1 = require("../lab_auth/middleware/require-auth.middleware");
const team_settings_controller_1 = require("./team_settings.controller");
const feature_settings_controller_1 = require("./feature_settings.controller");
const router = (0, express_1.Router)();
const deptController = new team_settings_controller_1.TeamSettingsController('department');
const desigController = new team_settings_controller_1.TeamSettingsController('designation');
const featureController = new feature_settings_controller_1.FeatureSettingsController();
router.use(require_auth_middleware_1.requireAuth);
// GET routes readable by authenticated users (admin/employee) for dropdowns and filters
router.get('/departments', deptController.list);
router.get('/departments/:id', deptController.get);
router.get('/designations', desigController.list);
router.get('/designations/:id', desigController.get);
router.get('/features', featureController.get);
// Write routes restricted to admins only
router.post('/departments', (0, require_auth_middleware_1.requireRole)(['admin']), deptController.create);
router.put('/departments/:id', (0, require_auth_middleware_1.requireRole)(['admin']), deptController.update);
router.patch('/departments/:id/status', (0, require_auth_middleware_1.requireRole)(['admin']), deptController.toggleStatus);
router.delete('/departments/:id', (0, require_auth_middleware_1.requireRole)(['admin']), deptController.delete);
router.post('/designations', (0, require_auth_middleware_1.requireRole)(['admin']), desigController.create);
router.put('/designations/:id', (0, require_auth_middleware_1.requireRole)(['admin']), desigController.update);
router.patch('/designations/:id/status', (0, require_auth_middleware_1.requireRole)(['admin']), desigController.toggleStatus);
router.delete('/designations/:id', (0, require_auth_middleware_1.requireRole)(['admin']), desigController.delete);
router.patch('/features', (0, require_auth_middleware_1.requireRole)(['admin']), featureController.update);
exports.default = router;
