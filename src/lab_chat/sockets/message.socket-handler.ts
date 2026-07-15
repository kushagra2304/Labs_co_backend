import { Server, Socket } from 'socket.io';
import { MessageService } from '../services/message.service';
import prisma from '../../prisma/client';
import { ConversationAuthorizationService } from '../services/conversation-authorization.service';

export const handleMessageEvents = (io: Server, socket: Socket, messageService: MessageService) => {
  const userId = socket.data.user.id;

  const emitUnreadCount = async (targetUserId: string) => {
    try {
      const count = await prisma.message.count({
        where: {
          senderId: { not: targetUserId },
          status: { not: 'READ' },
          deletedAt: null,
          conversation: {
            members: {
              some: {
                userId: targetUserId,
                deletedAt: null,
              },
            },
          },
        },
      });
      io.to(targetUserId).emit('unread_count_update', { count });
    } catch (error) {
      console.error(`Failed to emit unread count update for user ${targetUserId}:`, error);
    }
  };

  socket.on('send_message', async ({ conversationId, content, type, replyToId, tempId }) => {
    try {
      if (!conversationId) {
        socket.emit('error', { message: 'conversationId is required' });
        return;
      }

      const isAuth = await ConversationAuthorizationService.isAuthorized(conversationId, userId);
      if (!isAuth) {
        console.warn(`[SECURITY] Unauthorized send_message attempt by user ${userId} on conversation ${conversationId}`);
        socket.emit('error', { message: 'Unauthorized: You do not have access to this conversation.' });
        return;
      }

      const message = await messageService.sendMessage({
        conversationId,
        senderId: userId,
        content,
        messageType: type || 'TEXT',
        replyToId,
      });

      const serializedMessage = {
        ...message,
        attachments: message.attachments?.map((att) => ({
          ...att,
          fileSizeBytes: att.fileSizeBytes.toString(),
        })),
      };

      // Emit to conversation room (people who have joined the room socket)
      io.to(conversationId).emit('new_message', {
        message: serializedMessage,
        conversationId,
        tempId,
      });

      // Get all members of this conversation
      const members = await prisma.conversationMember.findMany({
        where: { conversationId, deletedAt: null },
        select: { userId: true },
      });

      // Emit new_message to every member's personal room so they receive it
      // even if they haven't join_room'd the conversation socket room
      for (const member of members) {
        if (member.userId !== userId) {
          io.to(member.userId).emit('new_message', {
            message: serializedMessage,
            conversationId,
            tempId,
          });
          await emitUnreadCount(member.userId);
        }
      }

      // ACK back to sender first (SENT)
      socket.emit('message_ack', {
        tempId,
        messageId: message.id,
        status: 'SENT',
      });

      // Check if any recipient is currently online (has an active socket in their personal room).
      // If so, the message is considered DELIVERED — update DB and notify the sender.
      const recipientIds = members.map((m) => m.userId).filter((id) => id !== userId);
      for (const recipientId of recipientIds) {
        const activeSockets = await io.in(recipientId).fetchSockets();
        if (activeSockets.length > 0) {
          await prisma.message.update({
            where: { id: message.id },
            data: { status: 'DELIVERED' },
          });
          // Notify the SENDER (not the recipient) that delivery is confirmed
          io.to(userId).emit('message_delivered', {
            messageId: message.id,
            conversationId,
          });
          break; // One online recipient is enough to confirm delivery
        }
      }
    } catch (error: any) {
      console.error('Socket send_message error:', error);
      socket.emit('error', { message: error.message || 'Failed to send message' });
    }
  });

  socket.on('message_read', async ({ messageId, conversationId }) => {
    try {
      if (!messageId || !conversationId) return;

      const isAuth = await ConversationAuthorizationService.isAuthorized(conversationId, userId);
      if (!isAuth) {
        console.warn(`[SECURITY] Unauthorized message_read attempt by user ${userId} on conversation ${conversationId}`);
        socket.emit('error', { message: 'Unauthorized: You do not have access to this conversation.' });
        return;
      }

      const isMsgAuth = await ConversationAuthorizationService.isMessageAuthorized(messageId, userId);
      if (!isMsgAuth) {
        console.warn(`[SECURITY] Unauthorized message_read attempt by user ${userId} on message ${messageId}`);
        socket.emit('error', { message: 'Unauthorized: Message does not belong to your conversation.' });
        return;
      }

      const result = await messageService.markAsRead(messageId, userId);

      // Notify the sender that the message has been read
      io.to(result.senderId).emit('read_receipt', {
        messageId,
        conversationId,
        userId,
      });

      await emitUnreadCount(userId);
    } catch (error) {
      console.error('Socket message_read error:', error);
    }
  });

  socket.on('conversation_read', async ({ conversationId }) => {
    try {
      if (!conversationId) return;

      const isAuth = await ConversationAuthorizationService.isAuthorized(conversationId, userId);
      if (!isAuth) {
        console.warn(`[SECURITY] Unauthorized conversation_read attempt by user ${userId} on conversation ${conversationId}`);
        socket.emit('error', { message: 'Unauthorized: You do not have access to this conversation.' });
        return;
      }

      const updatedMessages = await messageService.markConversationAsRead(conversationId, userId);
      
      for (const msg of updatedMessages) {
        io.to(msg.senderId).emit('read_receipt', {
          messageId: msg.id,
          conversationId,
          userId,
        });
      }

      await emitUnreadCount(userId);
    } catch (error) {
      console.error('Socket conversation_read error:', error);
    }
  });
};
