import prisma from '../../prisma/client';

export class ConversationAuthorizationService {
  /**
   * Helper to check if a string is a valid UUID to prevent database errors.
   */
  static isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  /**
   * Validates if a user is a member of a conversation, and the conversation is active.
   */
  static async isAuthorized(conversationId: string, userId: string): Promise<boolean> {
    if (!conversationId || !userId) {
      return false;
    }

    if (!this.isValidUUID(conversationId) || !this.isValidUUID(userId)) {
      return false;
    }

    try {
      // Find the conversation and check its status
      const conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          deletedAt: null,
        },
        select: {
          id: true,
          status: true,
        },
      });

      if (!conversation) {
        return false;
      }

      // Check if conversation status is CLOSED (not active)
      if (conversation.status === 'CLOSED') {
        return false;
      }

      // Find the member record
      const member = await prisma.conversationMember.findFirst({
        where: {
          conversationId,
          userId,
          deletedAt: null,
        },
        select: {
          id: true,
        },
      });

      return !!member;
    } catch (error) {
      console.error(`Authorization check failed for user ${userId} on conversation ${conversationId}:`, error);
      return false;
    }
  }

  /**
   * Checks authorization based on a messageId.
   */
  static async isMessageAuthorized(messageId: string, userId: string): Promise<boolean> {
    if (!messageId || !userId) {
      return false;
    }

    if (!this.isValidUUID(messageId) || !this.isValidUUID(userId)) {
      return false;
    }

    try {
      const message = await prisma.message.findFirst({
        where: {
          id: messageId,
          deletedAt: null,
        },
        select: {
          conversationId: true,
        },
      });

      if (!message) {
        return false;
      }

      return this.isAuthorized(message.conversationId, userId);
    } catch (error) {
      console.error(`Message authorization check failed for user ${userId} on message ${messageId}:`, error);
      return false;
    }
  }
}
