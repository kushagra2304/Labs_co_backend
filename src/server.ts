import http from 'http';
import dotenv from 'dotenv';
import app from './app';
import { initChatGateway } from './lab_chat';

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

const socketIo = initChatGateway(socketHttpServer);
app.set('io', socketIo);

socketHttpServer.listen(socketPort, () => {
  console.log(`⚡ Socket.IO Server running on port ${socketPort}`);
});

