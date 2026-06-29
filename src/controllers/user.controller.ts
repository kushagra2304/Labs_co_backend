import { Request, Response } from 'express';
import { UserRepository } from '../repositories/user.repository';

export class UserController {
  constructor(private userRepo = new UserRepository()) {}

  getEmployees = async (_req: Request, res: Response): Promise<void> => {
    try {
      const users = await this.userRepo.findAll();
      res.status(200).json({
        success: true,
        data: users,
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch employees',
      });
    }
  };
}
