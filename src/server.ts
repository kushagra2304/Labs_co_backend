import http from 'http';
import dotenv from 'dotenv';
import app from './app';
import { initChatGateway } from './lab_chat';
import { runTaskDeadlineCheck } from './jobs/task-deadline-reminder.job';
import { runFileAutoDeleteCheck } from './jobs/file-auto-delete.job';

dotenv.config();
console.log("DB target:", process.env.DATABASE_URL);

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

// Task deadline reminders: check for tasks due soon / overdue on a recurring
// basis (hourly is frequent enough for a due-date reminder, and the job is
// idempotent so re-runs are harmless). Runs once shortly after boot too.
const TASK_DEADLINE_CHECK_INTERVAL_MS = 60 * 60 * 1000;
setTimeout(() => runTaskDeadlineCheck(socketIo), 10_000);
setInterval(() => runTaskDeadlineCheck(socketIo), TASK_DEADLINE_CHECK_INTERVAL_MS);

// Project files: auto-delete anything past its 30-day expiry (review banner
// on the Files page covers the last 5 days of that window before this runs).
// Once a day is frequent enough — files don't need same-hour precision here.
const FILE_AUTO_DELETE_INTERVAL_MS = 24 * 60 * 60 * 1000;
setTimeout(() => runFileAutoDeleteCheck(), 15_000);
setInterval(() => runFileAutoDeleteCheck(), FILE_AUTO_DELETE_INTERVAL_MS);

