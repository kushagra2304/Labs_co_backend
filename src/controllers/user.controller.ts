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

  getChatUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      const currentUserId = req.user?.id;
      if (!currentUserId) {
        res.status(401).json({ success: false, error: 'Unauthorized: Missing user context' });
        return;
      }

      const users = await this.userRepo.findActiveEmployeesExcept(currentUserId);

      // Return user array directly containing only id, name, and email
      const formattedUsers = users.map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
      }));

      res.status(200).json(formattedUsers);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch chat users',
      });
    }
  };
}
