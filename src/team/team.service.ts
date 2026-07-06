import { TeamRepository, EmployeeFilters, PaginatedEmployees, TeamSummaryMetrics } from './team.repository';
import { User, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

export class TeamService {
  constructor(private teamRepo = new TeamRepository()) {}

  async getEmployees(filters: EmployeeFilters): Promise<PaginatedEmployees> {
    return this.teamRepo.findAll(filters);
  }

  async getEmployeeById(id: string): Promise<User & {
    tasksAssigned: any[];
    activityLogs: any[];
  }> {
    const employee = await this.teamRepo.findByIdWithDetails(id);
    if (!employee) {
      throw new Error('Employee not found');
    }
    return employee;
  }

  async getSummaryMetrics(): Promise<TeamSummaryMetrics> {
    return this.teamRepo.getSummaryMetrics();
  }

  async createEmployee(
    data: {
      firstName: string;
      lastName: string;
      username: string;
      email: string;
      password?: string;
      temporaryPassword?: string; // fallback field names
      phone?: string;
      gender?: string;
      dateOfBirth?: string | null;
      joinedDate?: string | null;
      employmentType?: string;
      department: string;
      designation: string;
      employeeId?: string;
    },
    actorId: string
  ): Promise<User> {
    const password = data.password || data.temporaryPassword;
    this.validateEmployeeData({ ...data, password }, false);

    // Uniqueness validation
    const existingUsername = await this.teamRepo.findByUsername(data.username);
    if (existingUsername) {
      throw new Error('Username already exists');
    }

    const existingEmail = await this.teamRepo.findByEmail(data.email);
    if (existingEmail) {
      throw new Error('Email address is already registered');
    }

    // Auto-generate employeeId if not provided
    let empId = data.employeeId?.trim();
    if (!empId) {
      const nextSeq = await this.teamRepo.findNextEmployeeSeq();
      const currentYear = new Date().getFullYear().toString().substring(2);
      empId = `EMP-${currentYear}-${String(nextSeq).padStart(3, '0')}`;
    }

    // Securely hash password
    const passwordHash = await bcrypt.hash(password!, 10);

    const name = `${data.firstName.trim()} ${data.lastName.trim()}`;

    // Random color for avatarColor if we want, e.g. a nice architect theme hex color
    const colors = ['#8B5E3C', '#2A4D69', '#4B86B4', '#ADC5CF', '#6A8A82', '#A37C74'];
    const avatarColor = colors[Math.floor(Math.random() * colors.length)];

    return this.teamRepo.create({
      name,
      email: data.email.trim().toLowerCase(),
      passwordHash,
      role: Role.employee,
      username: data.username.trim(),
      phone: data.phone?.trim() || null,
      gender: data.gender?.trim() || null,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      joinedDate: data.joinedDate ? new Date(data.joinedDate) : new Date(),
      employmentType: data.employmentType || 'Full-Time',
      department: data.department.trim(),
      designation: data.designation.trim(),
      employeeId: empId,
      avatarColor,
      createdBy: actorId,
    });
  }

  async updateEmployee(
    id: string,
    data: {
      firstName?: string;
      lastName?: string;
      username?: string;
      email?: string;
      phone?: string;
      gender?: string;
      dateOfBirth?: string | null;
      joinedDate?: string | null;
      employmentType?: string;
      department?: string;
      designation?: string;
      isActive?: boolean;
    },
    actorId: string
  ): Promise<User> {
    const existing = await this.teamRepo.findById(id);
    if (!existing) {
      throw new Error('Employee not found');
    }

    this.validateEmployeeData(data, true);

    // Uniqueness validation on update
    if (data.username && data.username.trim().toLowerCase() !== existing.username?.toLowerCase()) {
      const checkUsername = await this.teamRepo.findByUsername(data.username);
      if (checkUsername && checkUsername.id !== id) {
        throw new Error('Username already exists');
      }
    }

    if (data.email && data.email.trim().toLowerCase() !== existing.email.toLowerCase()) {
      const checkEmail = await this.teamRepo.findByEmail(data.email);
      if (checkEmail && checkEmail.id !== id) {
        throw new Error('Email address is already registered');
      }
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
      ...(data.email !== undefined && { email: data.email.trim().toLowerCase() }),
      ...(data.username !== undefined && { username: data.username.trim() }),
      ...(data.phone !== undefined && { phone: data.phone?.trim() || null }),
      ...(data.gender !== undefined && { gender: data.gender?.trim() || null }),
      ...(data.dateOfBirth !== undefined && { dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null }),
      ...(data.joinedDate !== undefined && { joinedDate: data.joinedDate ? new Date(data.joinedDate) : null }),
      ...(data.employmentType !== undefined && { employmentType: data.employmentType }),
      ...(data.department !== undefined && { department: data.department.trim() }),
      ...(data.designation !== undefined && { designation: data.designation.trim() }),
      ...(data.isActive !== undefined && { isActive: data.isActive }),
      updatedBy: actorId,
    });
  }

  async softDeleteEmployee(id: string, actorId: string): Promise<User> {
    const existing = await this.teamRepo.findById(id);
    if (!existing) {
      throw new Error('Employee not found');
    }
    return this.teamRepo.softDelete(id, actorId);
  }

  private validateEmployeeData(
    data: {
      firstName?: string;
      lastName?: string;
      username?: string;
      email?: string;
      password?: string;
      phone?: string;
      department?: string;
      designation?: string;
    },
    isUpdate = false
  ): void {
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

    // Username
    if (!isUpdate || data.username !== undefined) {
      if (!data.username || typeof data.username !== 'string' || !data.username.trim()) {
        throw new Error('Username is required');
      }
      if (data.username.length < 3) {
        throw new Error('Username must be at least 3 characters long');
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
    if (!isUpdate || data.designation !== undefined) {
      if (!data.designation || typeof data.designation !== 'string' || !data.designation.trim()) {
        throw new Error('Designation is required');
      }
    }
  }
}
