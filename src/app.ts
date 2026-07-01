import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { authRoutes } from './lab_auth';
import { chatRoutes } from './lab_chat';
import { dashboardRoutes } from './lab_dashboard';

const app = express();

app.use(cors({
  origin: '*',
  credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Auth module routes
app.use('/api/v1/auth', authRoutes);

// Chat module routes
app.use('/api/v1/chat', chatRoutes);
app.use('/api/chat', chatRoutes);

// Dashboard module routes — /employees preserved under /api/v1/chat for backward compatibility
app.use('/api/v1/chat', dashboardRoutes);
app.use('/api/chat', dashboardRoutes);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
});

export default app;
