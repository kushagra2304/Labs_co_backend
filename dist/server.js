"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const dotenv_1 = __importDefault(require("dotenv"));
const express_app_1 = __importDefault(require("./express-app"));
const chat_gateway_1 = require("./sockets/chat.gateway");
dotenv_1.default.config();
const port = process.env.PORT || 5000;
const socketPort = process.env.SOCKET_PORT || 5001;
const httpServer = http_1.default.createServer(express_app_1.default);
httpServer.listen(port, () => {
    console.log(`🚀 REST Server running on port ${port}`);
});
const socketHttpServer = http_1.default.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Socket Server\n');
});
(0, chat_gateway_1.initChatGateway)(socketHttpServer);
socketHttpServer.listen(socketPort, () => {
    console.log(`⚡ Socket.IO Server running on port ${socketPort}`);
});
