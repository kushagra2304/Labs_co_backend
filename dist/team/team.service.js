"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamService = void 0;
const team_repository_1 = require("./team.repository");
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const client_2 = __importDefault(require("../prisma/client"));
const feature_settings_service_1 = require("../team_settings/feature_settings.service");
const isUuid = (val) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(val);
class TeamService {
    teamRepo;
    constructor(teamRepo = new team_repository_1.TeamRepository()) {
        this.teamRepo = teamRepo;
    }
    async getEmployees(filters) {
        return this.teamRepo.findAll(filters);
    }
    async getEmployeeById(id) {
        const employee = await this.teamRepo.findByIdWithDetails(id);
        if (!employee) {
            throw new Error('Employee not found');
        }
        return employee;
    }
    async getSummaryMetrics() {
        return this.teamRepo.getSummaryMetrics();
    }
    async createEmployee(data, actorId) {
        const password = data.password || data.temporaryPassword;
        const featureService = new feature_settings_service_1.FeatureSettingsService();
        const useDesignations = await featureService.isEnabled('useDesignations');
        this.validateEmployeeData({ ...data, password }, false, useDesignations);
        const emailVal = data.email.trim().toLowerCase();
        // Uniqueness validation on email (and username)
        const existingEmail = await this.teamRepo.findByEmail(emailVal);
        if (existingEmail) {
            throw new Error('Email address is already registered');
        }
        // Validate department exists and is active
        let deptRecord;
        if (isUuid(data.department)) {
            deptRecord = await client_2.default.department.findFirst({
                where: { id: data.department, deletedAt: null }
            });
        }
        else {
            deptRecord = await client_2.default.department.findFirst({
                where: { name: { equals: data.department.trim(), mode: 'insensitive' }, deletedAt: null }
            });
        }
        if (!deptRecord) {
            throw new Error(`Department "${data.department}" does not exist`);
        }
        if (!deptRecord.isActive) {
            throw new Error(`Department "${deptRecord.name}" is deactivated`);
        }
        // Validate designation exists and is active
        let desigRecord = null;
        if (useDesignations && data.designation) {
            if (isUuid(data.designation)) {
                desigRecord = await client_2.default.designation.findFirst({
                    where: { id: data.designation, deletedAt: null }
                });
            }
            else {
                desigRecord = await client_2.default.designation.findFirst({
                    where: { name: { equals: data.designation.trim(), mode: 'insensitive' }, deletedAt: null }
                });
            }
            if (!desigRecord) {
                throw new Error(`Designation "${data.designation}" does not exist`);
            }
            if (!desigRecord.isActive) {
                throw new Error(`Designation "${desigRecord.name}" is deactivated`);
            }
        }
        // Auto-generate employeeId
        const nextSeq = await this.teamRepo.findNextEmployeeSeq();
        const currentYear = new Date().getFullYear().toString().substring(2);
        const empId = `EMP-${currentYear}-${String(nextSeq).padStart(3, '0')}`;
        // Securely hash password
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        const name = `${data.firstName.trim()} ${data.lastName.trim()}`;
        // Random color for avatarColor if we want, e.g. a nice architect theme hex color
        const colors = ['#8B5E3C', '#2A4D69', '#4B86B4', '#ADC5CF', '#6A8A82', '#A37C74'];
        const avatarColor = colors[Math.floor(Math.random() * colors.length)];
        return this.teamRepo.create({
            name,
            email: emailVal,
            passwordHash,
            role: client_1.Role.employee,
            username: emailVal, // Email is the login identifier
            phone: data.phone?.trim() || null,
            gender: data.gender?.trim() || null,
            dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
            joinedDate: data.joinedDate ? new Date(data.joinedDate) : new Date(),
            employmentType: 'Full-Time', // Defaults to Full-Time, hidden from UI
            department: deptRecord.name,
            designation: desigRecord ? desigRecord.name : null,
            departmentRel: { connect: { id: deptRecord.id } },
            ...(desigRecord ? { designationRel: { connect: { id: desigRecord.id } } } : {}),
            employeeId: empId,
            avatarColor,
            createdBy: actorId,
        });
    }
    async updateEmployee(id, data, actorId) {
        const existing = await this.teamRepo.findById(id);
        if (!existing) {
            throw new Error('Employee not found');
        }
        const featureService = new feature_settings_service_1.FeatureSettingsService();
        const useDesignations = await featureService.isEnabled('useDesignations');
        this.validateEmployeeData(data, true, useDesignations);
        // Uniqueness validation on email (and username)
        if (data.email && data.email.trim().toLowerCase() !== existing.email.toLowerCase()) {
            const checkEmail = await this.teamRepo.findByEmail(data.email);
            if (checkEmail && checkEmail.id !== id) {
                throw new Error('Email address is already registered');
            }
        }
        // Validate and load new Department if changing
        let deptRecord = null;
        if (data.department !== undefined) {
            if (isUuid(data.department)) {
                deptRecord = await client_2.default.department.findFirst({
                    where: { id: data.department, deletedAt: null }
                });
            }
            else {
                deptRecord = await client_2.default.department.findFirst({
                    where: { name: { equals: data.department.trim(), mode: 'insensitive' }, deletedAt: null }
                });
            }
            if (!deptRecord) {
                throw new Error(`Department "${data.department}" does not exist`);
            }
            if (!deptRecord.isActive && deptRecord.id !== existing.departmentId) {
                throw new Error('Department is deactivated');
            }
        }
        // Validate and load new Designation if changing
        let desigRecord = null;
        let shouldDisconnectDesignation = false;
        if (useDesignations) {
            if (data.designation !== undefined) {
                if (data.designation === null || data.designation.trim() === '') {
                    shouldDisconnectDesignation = true;
                }
                else {
                    if (isUuid(data.designation)) {
                        desigRecord = await client_2.default.designation.findFirst({
                            where: { id: data.designation, deletedAt: null }
                        });
                    }
                    else {
                        desigRecord = await client_2.default.designation.findFirst({
                            where: { name: { equals: data.designation.trim(), mode: 'insensitive' }, deletedAt: null }
                        });
                    }
                    if (!desigRecord) {
                        throw new Error(`Designation "${data.designation}" does not exist`);
                    }
                    if (!desigRecord.isActive && desigRecord.id !== existing.designationId) {
                        throw new Error(`Designation "${desigRecord.name}" is deactivated`);
                    }
                }
            }
        }
        else {
            shouldDisconnectDesignation = true;
        }
        let name = existing.name;
        if (data.firstName !== undefined || data.lastName !== undefined) {
            const existingParts = existing.name.split(' ');
            const fName = data.firstName !== undefined ? data.firstName.trim() : existingParts[0] || '';
            const lName = data.lastName !== undefined ? data.lastName.trim() : existingParts.slice(1).join(' ') || '';
            name = `${fName} ${lName}`;
        }
        return this.teamRepo.update(id, {
            name,
            ...(data.email !== undefined && {
                email: data.email.trim().toLowerCase(),
                username: data.email.trim().toLowerCase()
            }),
            ...(data.phone !== undefined && { phone: data.phone?.trim() || null }),
            ...(data.gender !== undefined && { gender: data.gender?.trim() || null }),
            ...(data.dateOfBirth !== undefined && { dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null }),
            ...(data.joinedDate !== undefined && { joinedDate: data.joinedDate ? new Date(data.joinedDate) : null }),
            ...(deptRecord && { department: deptRecord.name, departmentRel: { connect: { id: deptRecord.id } } }),
            ...(useDesignations ? (desigRecord ? { designation: desigRecord.name, designationRel: { connect: { id: desigRecord.id } } } :
                (shouldDisconnectDesignation ? { designation: null, designationRel: { disconnect: true } } : {})) : { designation: null, designationRel: { disconnect: true } }),
            ...(data.isActive !== undefined && { isActive: data.isActive }),
            updatedBy: actorId,
        });
    }
    async softDeleteEmployee(id, actorId) {
        const existing = await this.teamRepo.findById(id);
        if (!existing) {
            throw new Error('Employee not found');
        }
        return this.teamRepo.softDelete(id, actorId);
    }
    validateEmployeeData(data, isUpdate = false, useDesignations = true) {
        // First Name
        if (!isUpdate || data.firstName !== undefined) {
            if (!data.firstName || typeof data.firstName !== 'string' || !data.firstName.trim()) {
                throw new Error('First name is required');
            }
        }
        // Last Name
        if (!isUpdate || data.lastName !== undefined) {
            if (!data.lastName || typeof data.lastName !== 'string' || !data.lastName.trim()) {
                throw new Error('Last name is required');
            }
        }
        // Email
        if (!isUpdate || data.email !== undefined) {
            if (!data.email || typeof data.email !== 'string' || !data.email.trim()) {
                throw new Error('Email address is required');
            }
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(data.email)) {
                throw new Error('Email address format is invalid');
            }
        }
        // Password strength check
        if (!isUpdate) {
            if (!data.password || typeof data.password !== 'string') {
                throw new Error('Temporary password is required');
            }
            if (data.password.length < 6) {
                throw new Error('Temporary password must be at least 6 characters long');
            }
        }
        // Phone format if provided
        if (data.phone) {
            const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-s.]?[0-9]{3}[-s.]?[0-9]{4,6}$/;
            if (!phoneRegex.test(data.phone.replace(/[\s-]/g, ''))) {
                throw new Error('Phone number format is invalid');
            }
        }
        // Department
        if (!isUpdate || data.department !== undefined) {
            if (!data.department || typeof data.department !== 'string' || !data.department.trim()) {
                throw new Error('Department is required');
            }
        }
        // Designation
        if (useDesignations && (!isUpdate || data.designation !== undefined)) {
            if (!data.designation || typeof data.designation !== 'string' || !data.designation.trim()) {
                throw new Error('Designation is required');
            }
        }
    }
}
exports.TeamService = TeamService;
