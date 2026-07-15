"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const http_1 = __importDefault(require("http"));
const dotenv_1 = __importDefault(require("dotenv"));
const app_1 = __importDefault(require("./app"));
const lab_chat_1 = require("./lab_chat");
const task_deadline_reminder_job_1 = require("./jobs/task-deadline-reminder.job");
const file_auto_delete_job_1 = require("./jobs/file-auto-delete.job");
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
// Task deadline reminders: check for tasks due soon / overdue on a recurring
// basis (hourly is frequent enough for a due-date reminder, and the job is
// idempotent so re-runs are harmless). Runs once shortly after boot too.
const TASK_DEADLINE_CHECK_INTERVAL_MS = 60 * 60 * 1000;
setTimeout(() => (0, task_deadline_reminder_job_1.runTaskDeadlineCheck)(socketIo), 10_000);
setInterval(() => (0, task_deadline_reminder_job_1.runTaskDeadlineCheck)(socketIo), TASK_DEADLINE_CHECK_INTERVAL_MS);
// Project files: auto-delete anything past its 30-day expiry (review banner
// on the Files page covers the last 5 days of that window before this runs).
// Once a day is frequent enough — files don't need same-hour precision here.
const FILE_AUTO_DELETE_INTERVAL_MS = 24 * 60 * 60 * 1000;
setTimeout(() => (0, file_auto_delete_job_1.runFileAutoDeleteCheck)(), 15_000);
setInterval(() => (0, file_auto_delete_job_1.runFileAutoDeleteCheck)(), FILE_AUTO_DELETE_INTERVAL_MS);
