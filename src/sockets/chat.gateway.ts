import { Server } from 'socket.io';
import http from 'http';
import { createRedisClient } from '../config/redis.config';
import { createAdapter } from '@socket.io/redis-adapter';
import { socketAuthMiddleware } from '../middlewares/socket-auth.middleware';
import { handlePresenceEvents, handleUserConnect, handleUserDisconnect } from './presence.socket-handler';
import { handleMessageEvents } from './message.socket-handler';
import { PresenceService } from '../services/presence.service';
import { MessageService } from '../services/message.service';

export const initChatGateway = (server: http.Server) => {
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  const pubClient = createRedisClient();
  const subClient = createRedisClient();

  io.adapter(createAdapter(pubClient, subClient));

  io.use(socketAuthMiddleware);

  const presenceService = new PresenceService();
  const messageService = new MessageService();

  io.on('connection', async (socket) => {
    await handleUserConnect(io, socket, presenceService);

    handlePresenceEvents(io, socket, presenceService);
    handleMessageEvents(io, socket, messageService);

    socket.on('disconnect', async () => {
      await handleUserDisconnect(io, socket, presenceService);
    });
  });

  return io;
};
