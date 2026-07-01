import { Request, Response } from 'express';
import { UserRepository } from '../../helpers/user.repository';

export class UserController {
  constructor(private userRepo = new UserRepository()) {}

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
