import { Socket } from 'socket.io';
import prisma from '../../prisma/client';
import { verifyToken } from '../../utils/jwt.util';

export const socketAuthMiddleware = async (socket: Socket, next: (err?: Error) => void) => {
  try {
    const token =
      (socket.handshake.auth.token as string) ||
      (socket.handshake.query.token as string);

    if (!token) {
      next(new Error('Authentication error: No token provided'));
      return;
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      next(new Error('Authentication error: Invalid or expired token'));
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      next(new Error('Authentication error: User not found'));
      return;
    }

    if (!user.isActive) {
      next(new Error('Authentication error: Account is deactivated'));
      return;
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
