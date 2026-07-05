"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.publishActivity = publishActivity;
const client_1 = __importDefault(require("../prisma/client"));
async function publishActivity({ userId, type, title, body, relatedId, relatedType, io }) {
    try {
        // 1. Persist the activity/notification in the database
        const notification = await client_1.default.notification.create({
            data: {
                userId,
                type,
                title,
                body,
                isRead: false,
                relatedId,
                relatedType,
            },
        });
        // 2. Emit it through Socket.IO if available
        if (io) {
            io.to(userId).emit('new_notification', {
                id: notification.id,
                title: notification.title ?? "",
                body: notification.body ?? "",
                timestamp: notification.createdAt.toISOString(),
                read: notification.isRead,
                type: notification.type,
                relatedId: notification.relatedId,
                relatedType: notification.relatedType,
            });
            console.log(`⚡ Real-time activity emitted to user ${userId}:`, notification.title);
        }
        return notification;
    }
    catch (error) {
        console.error('Error in publishActivity helper:', error);
        return null;
    }
}
