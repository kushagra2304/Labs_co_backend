import { Socket } from 'socket.io';
import prisma from '../config/prisma.config';
import { MOCK_USER_ID } from './require-auth.middleware';

export const socketAuthMiddleware = async (socket: Socket, next: (err?: Error) => void) => {
  try {
    const userId = 
      (socket.handshake.auth.userId as string) || 
      (socket.handshake.query.userId as string) || 
      MOCK_USER_ID;

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
        next(new Error('Authentication error: User not found'));
        return;
      }
    }

    socket.data.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Authentication error'));
  }
};
