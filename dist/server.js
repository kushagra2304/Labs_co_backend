"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const dotenv_1 = __importDefault(require("dotenv"));
const app_1 = __importDefault(require("./app"));
const lab_chat_1 = require("./lab_chat");
dotenv_1.default.config();
console.log("DB target:", process.env.DATABASE_URL);
const port = process.env.PORT || 5000;
const socketPort = process.env.SOCKET_PORT || 5001;
const httpServer = http_1.default.createServer(app_1.default);
httpServer.listen(port, () => {
    console.log(`🚀 REST Server running on port ${port}`);
});
const socketHttpServer = http_1.default.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Socket Server\n');
});
const socketIo = (0, lab_chat_1.initChatGateway)(socketHttpServer);
app_1.default.set('io', socketIo);
socketHttpServer.listen(socketPort, () => {
    console.log(`⚡ Socket.IO Server running on port ${socketPort}`);
});
