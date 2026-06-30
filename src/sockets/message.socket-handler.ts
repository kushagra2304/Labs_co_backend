import { Server, Socket } from 'socket.io';
import { MessageService } from '../services/message.service';

export const handleMessageEvents = (io: Server, socket: Socket, messageService: MessageService) => {
  const userId = socket.data.user.id;

  socket.on('send_message', async ({ conversationId, content, type, replyToId, tempId }) => {
    try {
      if (!conversationId) {
        socket.emit('error', { message: 'conversationId is required' });
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

      io.to(conversationId).emit('new_message', {
        message: serializedMessage,
        conversationId,
      });

      socket.emit('message_ack', {
        tempId,
        messageId: message.id,
        status: 'SENT',
      });
    } catch (error: any) {
      console.error('Socket send_message error:', error);
      socket.emit('error', { message: error.message || 'Failed to send message' });
    }
  });

  socket.on('message_read', async ({ messageId, conversationId }) => {
    try {
      if (!messageId || !conversationId) return;

      await messageService.markAsRead(messageId, userId);

      io.to(conversationId).emit('read_receipt', {
        messageId,
        userId,
      });
    } catch (error) {
      console.error('Socket message_read error:', error);
    }
  });
};
