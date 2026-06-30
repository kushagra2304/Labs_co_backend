import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma.config';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        name: string;
        email: string;
        role: string;
      };
    }
  }
}

export const MOCK_USER_ID = '11111111-1111-1111-1111-111111111111';

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req.headers['x-user-id'] as string) || MOCK_USER_ID;

    let user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      if (userId === MOCK_USER_ID) {
        user = await prisma.user.create({
          data: {
            id: MOCK_USER_ID,
            name: 'Mock User',
            email: 'mockuser@example.com',
            role: 'employee',
            isActive: true,
            lastSeen: new Date(),
          },
        });
      } else {
        res.status(401).json({ success: false, error: 'Unauthorized: User not found' });
        return;
      }
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    console.error('requireAuth middleware error:', error);
    res.status(500).json({ success: false, error: 'Authentication failed' });
  }
};

export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ success: false, error: 'Forbidden: Insufficient permissions' });
      return;
    }

    next();
  };
};
