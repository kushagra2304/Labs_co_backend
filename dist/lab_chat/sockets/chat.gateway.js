"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.initChatGateway = void 0;
const socket_io_1 = require("socket.io");
const redis_config_1 = require("../../config/redis.config");
const redis_adapter_1 = require("@socket.io/redis-adapter");
const socket_auth_middleware_1 = require("../middleware/socket-auth.middleware");
const presence_socket_handler_1 = require("./presence.socket-handler");
const message_socket_handler_1 = require("./message.socket-handler");
const presence_service_1 = require("../services/presence.service");
const message_service_1 = require("../services/message.service");
const initChatGateway = (server) => {
    const io = new socket_io_1.Server(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST'],
        },
    });
    const pubClient = (0, redis_config_1.createRedisClient)();
    const subClient = (0, redis_config_1.createRedisClient)();
    io.adapter((0, redis_adapter_1.createAdapter)(pubClient, subClient));
    io.use(socket_auth_middleware_1.socketAuthMiddleware);
    const presenceService = new presence_service_1.PresenceService();
    const messageService = new message_service_1.MessageService();
    io.on('connection', async (socket) => {
        await (0, presence_socket_handler_1.handleUserConnect)(io, socket, presenceService);
        (0, presence_socket_handler_1.handlePresenceEvents)(io, socket, presenceService);
        (0, message_socket_handler_1.handleMessageEvents)(io, socket, messageService);
        socket.on('disconnect', async () => {
            await (0, presence_socket_handler_1.handleUserDisconnect)(io, socket, presenceService);
        });
    });
    return io;
};
exports.initChatGateway = initChatGateway;
