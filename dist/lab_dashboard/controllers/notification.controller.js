"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationController = void 0;
const client_1 = __importDefault(require("../../prisma/client"));
class NotificationController {
    listNotifications = async (req, res) => {
        const notifications = await client_1.default.notification.findMany({
            where: { userId: req.user.id },
            orderBy: { createdAt: "desc" },
            take: 30,
        });
        res.json(notifications.map((n) => ({
            id: n.id,
            title: n.title ?? "",
            body: n.body ?? "",
            timestamp: n.createdAt.toISOString(),
            read: n.isRead,
            type: n.type,
            relatedId: n.relatedId,
            relatedType: n.relatedType,
        })));
    };
    markRead = async (req, res) => {
        const id = String(req.params.id);
        await client_1.default.notification.updateMany({
            where: { id, userId: req.user.id },
            data: { isRead: true },
        });
        res.status(204).send();
    };
    markAllRead = async (req, res) => {
        await client_1.default.notification.updateMany({
            where: { userId: req.user.id, isRead: false },
            data: { isRead: true },
        });
        res.status(204).send();
    };
    dismissNotification = async (req, res) => {
        const id = String(req.params.id);
        await client_1.default.notification.deleteMany({
            where: { id, userId: req.user.id },
        });
        res.status(204).send();
    };
}
exports.NotificationController = NotificationController;
