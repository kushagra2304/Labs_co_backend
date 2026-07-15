import { Request, Response } from 'express';
import { UserRepository } from '../../helpers/user.repository';
import { PresenceService } from '../services/presence.service';

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
      const presenceService = new PresenceService();

      const formattedUsers = await Promise.all(
        users.map(async (user) => {
          const isOnline = await presenceService.isUserOnline(user.id);
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            avatarUrl: user.avatarUrl || null,
            role: user.role,
            isActive: user.isActive,
            lastSeen: user.lastSeen,
            isOnline,
          };
        })
      );

      res.status(200).json(formattedUsers);
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to fetch chat users',
      });
    }
  };
}
