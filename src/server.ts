import http from 'http';
import dotenv from 'dotenv';
import app from './express-app';
import { initChatGateway } from './sockets/chat.gateway';

dotenv.config();

const port = process.env.PORT || 5000;
const socketPort = process.env.SOCKET_PORT || 5001;

const httpServer = http.createServer(app);
httpServer.listen(port, () => {
  console.log(`🚀 REST Server running on port ${port}`);
});

const socketHttpServer = http.createServer((_req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Socket Server\n');
});

initChatGateway(socketHttpServer);

socketHttpServer.listen(socketPort, () => {
  console.log(`⚡ Socket.IO Server running on port ${socketPort}`);
});
